import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, guestProgress, questions as questionsTable } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';
import { calculateSessionPoints } from '@/lib/gamification/points';
import { calculateStreak } from '@/lib/gamification/streaks';

const VALID_AGE_GROUPS = new Set(['4-5', '6-9', '10-12']);
const VALID_SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns', 'mixed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-IP burst guard (in-memory — best-effort in serverless; DB cap below is the authoritative limit)
const IP_LIMIT = { max: 15, windowMs: 60_000 };
// Hard daily caps enforced in DB (survive cold starts and multiple instances)
const MAX_SESSIONS_PER_GUEST_PER_DAY = 50;
const MAX_SESSIONS_PER_IP_PER_DAY = 200;
// Minimum ms per answer — anything faster is impossible for a human
const MIN_MS_PER_ANSWER = 500;

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // Burst guard (in-memory, best-effort)
  const rl = rateLimit(`sessions:${ip}`, IP_LIMIT.max, IP_LIMIT.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const body = await req.json();
    const { guestId, ageGroup, skillArea, timeTakenMs, answers } = body;

    // ── Basic validation ────────────────────────────────────────────────
    if (!ageGroup || !skillArea || !guestId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!VALID_AGE_GROUPS.has(ageGroup) || !VALID_SKILL_AREAS.has(skillArea)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    if (!UUID_RE.test(guestId)) {
      return NextResponse.json({ error: 'Invalid guestId' }, { status: 400 });
    }

    // ── Parse answers (required) ────────────────────────────────────────
    const rawAnswers: { questionId?: string; selectedOption?: unknown; timeSpentMs?: unknown }[] =
      Array.isArray(answers) ? answers.slice(0, 30) : [];

    const parsedAnswers = rawAnswers.filter(
      (a) => typeof a.questionId === 'string' && UUID_RE.test(a.questionId)
    ).map((a) => ({
      questionId: a.questionId as string,
      selectedOption:
        Number.isInteger(a.selectedOption) &&
        (a.selectedOption as number) >= 0 &&
        (a.selectedOption as number) <= 3
          ? (a.selectedOption as number)
          : null,
      timeSpentMs: Math.min(Math.max(parseInt(String(a.timeSpentMs)) || 0, 0), 3_600_000),
    }));

    if (parsedAnswers.length === 0) {
      return NextResponse.json({ error: 'No valid answers provided' }, { status: 400 });
    }

    // ── Speed check: reject impossibly fast sessions ────────────────────
    const safeTime = Math.min(Math.max(parseInt(timeTakenMs) || 0, 0), 3_600_000);
    if (safeTime < parsedAnswers.length * MIN_MS_PER_ANSWER) {
      return NextResponse.json({ error: 'Invalid session timing' }, { status: 400 });
    }

    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // ── DB-backed daily caps (survive serverless cold starts) ───────────
    const [guestCap] = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(sessions)
      .where(and(eq(sessions.guestId, guestId), sql`DATE(started_at) = ${today}`));

    if ((guestCap?.cnt ?? 0) >= MAX_SESSIONS_PER_GUEST_PER_DAY) {
      return NextResponse.json({ error: 'Daily session limit reached' }, { status: 429 });
    }

    // IP daily cap — best-effort; requires migrate-add-ip.ts to have been run
    try {
      const [ipCap] = await db.select({ cnt: sql<number>`COUNT(*)` })
        .from(sessions)
        .where(sql`DATE(started_at) = ${today} AND ip_address = ${ip}`);
      if ((ipCap?.cnt ?? 0) >= MAX_SESSIONS_PER_IP_PER_DAY) {
        return NextResponse.json({ error: 'Daily session limit reached' }, { status: 429 });
      }
    } catch {
      // Column not yet migrated — skip IP cap until migration runs
    }

    // ── Server-side answer verification ────────────────────────────────
    // Never trust client-provided score/points/isCorrect — compute from DB
    const questionIds = parsedAnswers.map((a) => a.questionId);
    const dbQuestions = await db
      .select({ id: questionsTable.id, correctOptionIndex: questionsTable.correctOptionIndex })
      .from(questionsTable)
      .where(and(inArray(questionsTable.id, questionIds), eq(questionsTable.isActive, true)));

    const correctMap = new Map(dbQuestions.map((q) => [q.id, q.correctOptionIndex]));

    const verifiedAnswers = parsedAnswers.map((a) => ({
      ...a,
      isCorrect:
        a.selectedOption !== null &&
        correctMap.has(a.questionId) &&
        correctMap.get(a.questionId) === a.selectedOption,
    }));

    // Only count answers for questions that actually exist in our DB
    const validAnswers = verifiedAnswers.filter((a) => correctMap.has(a.questionId));
    if (validAnswers.length === 0) {
      return NextResponse.json({ error: 'No valid questions found' }, { status: 400 });
    }

    const serverScore = validAnswers.filter((a) => a.isCorrect).length;
    const serverTotal = validAnswers.length;

    // ── Server-side points computation ─────────────────────────────────
    const [existingProgress] = await db
      .select({ lastPracticeDate: guestProgress.lastPracticeDate, currentStreak: guestProgress.currentStreak })
      .from(guestProgress)
      .where(eq(guestProgress.guestId, guestId));

    const { newStreak, isFirstSessionToday } = calculateStreak(
      existingProgress?.lastPracticeDate ?? null,
      existingProgress?.currentStreak ?? 0
    );
    const serverPoints = calculateSessionPoints(serverScore, serverTotal, isFirstSessionToday, newStreak);

    // ── Persist ─────────────────────────────────────────────────────────
    // Use the sessionId from start endpoint if provided (UPDATE existing record),
    // otherwise INSERT a new one (backwards compatibility).
    const incomingId = typeof body.sessionId === 'string' && UUID_RE.test(body.sessionId)
      ? body.sessionId
      : null;
    const sessionId = incomingId ?? crypto.randomUUID();
    const now = new Date().toISOString();

    if (incomingId) {
      // Session was pre-registered via /api/sessions/start — update it
      await db.update(sessions).set({
        score: serverScore,
        totalQuestions: serverTotal,
        pointsEarned: serverPoints,
        timeTakenMs: safeTime,
        completedAt: now,
        ipAddress: ip,
      }).where(eq(sessions.id, incomingId));
    } else {
      await db.insert(sessions).values({
        id: sessionId,
        guestId,
        ageGroup,
        skillArea,
        score: serverScore,
        totalQuestions: serverTotal,
        pointsEarned: serverPoints,
        timeTakenMs: safeTime,
        completedAt: now,
        ipAddress: ip,
      });
    }

    await db.insert(sessionAnswers).values(
      validAnswers.map((a) => ({
        id: crypto.randomUUID(),
        sessionId,
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        timeSpentMs: a.timeSpentMs,
      }))
    );

    await db.insert(guestProgress).values({
      guestId,
      totalPoints: serverPoints,
      totalSessions: 1,
      totalCorrect: serverScore,
      totalAnswered: serverTotal,
      currentStreak: newStreak,
      longestStreak: newStreak,
      lastPracticeDate: today,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: guestProgress.guestId,
      set: {
        totalPoints: sql`total_points + ${serverPoints}`,
        totalSessions: sql`total_sessions + 1`,
        totalCorrect: sql`total_correct + ${serverScore}`,
        totalAnswered: sql`total_answered + ${serverTotal}`,
        currentStreak: newStreak,
        longestStreak: sql`MAX(longest_streak, ${newStreak})`,
        lastPracticeDate: today,
        updatedAt: now,
      },
    });

    return NextResponse.json({ sessionId, score: serverScore, total: serverTotal, points: serverPoints });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
