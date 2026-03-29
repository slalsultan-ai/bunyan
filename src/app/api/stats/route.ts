import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { rateLimit, getIp } from '@/lib/rate-limit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SKILL_AREAS = new Set(['quantitative', 'verbal', 'logical_patterns']);

export async function GET(req: NextRequest) {
  const rl = rateLimit(`stats:${getIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const guestId = req.nextUrl.searchParams.get('guest_id');
    if (!guestId || !UUID_RE.test(guestId)) {
      return NextResponse.json({ error: 'guest_id required' }, { status: 400 });
    }

    const db = getDb();

    // Single aggregation query instead of loading all rows
    const [[totals], skillRows, recentSessions] = await Promise.all([
      db.select({
        totalSessions: sql<number>`count(*)`,
        totalCorrect:  sql<number>`sum(coalesce(${sessions.score}, 0))`,
        totalAnswered: sql<number>`sum(coalesce(${sessions.totalQuestions}, 0))`,
      })
        .from(sessions)
        .where(eq(sessions.guestId, guestId)),

      db.select({
        skillArea: sessions.skillArea,
        correct:   sql<number>`sum(coalesce(${sessions.score}, 0))`,
        total:     sql<number>`sum(coalesce(${sessions.totalQuestions}, 0))`,
      })
        .from(sessions)
        .where(eq(sessions.guestId, guestId))
        .groupBy(sessions.skillArea),

      db.select({
        id:             sessions.id,
        ageGroup:       sessions.ageGroup,
        skillArea:      sessions.skillArea,
        score:          sessions.score,
        totalQuestions: sessions.totalQuestions,
        timeTakenMs:    sessions.timeTakenMs,
        pointsEarned:   sessions.pointsEarned,
        startedAt:      sessions.startedAt,
        completedAt:    sessions.completedAt,
      })
        .from(sessions)
        .where(and(eq(sessions.guestId, guestId)))
        .orderBy(desc(sessions.startedAt))
        .limit(10),
    ]);

    const breakdown = {
      quantitative:    { correct: 0, total: 0 },
      verbal:          { correct: 0, total: 0 },
      logical_patterns:{ correct: 0, total: 0 },
    };
    for (const r of skillRows) {
      if (SKILL_AREAS.has(r.skillArea)) {
        const key = r.skillArea as keyof typeof breakdown;
        breakdown[key].correct = Number(r.correct);
        breakdown[key].total   = Number(r.total);
      }
    }

    return NextResponse.json({
      totalSessions: Number(totals?.totalSessions ?? 0),
      totalCorrect:  Number(totals?.totalCorrect  ?? 0),
      totalAnswered: Number(totals?.totalAnswered  ?? 0),
      skillBreakdown: breakdown,
      recentSessions,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
