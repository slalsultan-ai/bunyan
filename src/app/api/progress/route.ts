import { NextRequest } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc } from 'drizzle-orm';

/**
 * GET /api/progress?childId=...
 * Returns progress data for a specific child, used by the /progress page
 * when a logged-in parent has a selected child.
 */
export async function GET(req: NextRequest) {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const childId = req.nextUrl.searchParams.get('childId');
  if (!childId) {
    return Response.json({ error: 'childId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify parent owns or follows this child
  const [child] = await db.select().from(children)
    .where(eq(children.id, childId)).limit(1);

  if (!child) {
    return Response.json({ error: 'Child not found' }, { status: 404 });
  }

  const isOwner = child.parentId === session.parentId;
  if (!isOwner) {
    const [followerLink] = await db.select().from(childParents)
      .where(and(eq(childParents.childId, childId), eq(childParents.parentId, session.parentId)))
      .limit(1);
    if (!followerLink) {
      return Response.json({ error: 'Child not found' }, { status: 404 });
    }
  }

  // Aggregate totals
  const [totals] = await db.select({
    totalSessions: sql<number>`COUNT(*)`.as('totalSessions'),
    totalCorrect: sql<number>`COALESCE(SUM(${sessions.score}), 0)`.as('totalCorrect'),
    totalAnswered: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`.as('totalAnswered'),
    totalPoints: sql<number>`COALESCE(SUM(${sessions.pointsEarned}), 0)`.as('totalPoints'),
  }).from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)));

  // Streak: count consecutive days with sessions
  const recentDays = await db.select({
    day: sql<string>`DATE(${sessions.completedAt})`.as('day'),
  }).from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .groupBy(sql`DATE(${sessions.completedAt})`)
    .orderBy(desc(sql`DATE(${sessions.completedAt})`))
    .limit(60);

  let currentStreak = 0;
  if (recentDays.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const firstDay = new Date(recentDays[0].day + 'T00:00:00');
    // Streak starts if most recent session is today or yesterday
    if (firstDay >= yesterday) {
      currentStreak = 1;
      for (let i = 1; i < recentDays.length; i++) {
        const prev = new Date(recentDays[i - 1].day + 'T00:00:00');
        const curr = new Date(recentDays[i].day + 'T00:00:00');
        const diffMs = prev.getTime() - curr.getTime();
        if (diffMs <= 86400000) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Skill breakdown
  const skillRows = await db.select({
    skillArea: questions.skillArea,
    correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('correct'),
    total: sql<number>`COUNT(*)`.as('total'),
  }).from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .groupBy(questions.skillArea);

  const skillBreakdown: Record<string, { correct: number; total: number }> = {};
  for (const row of skillRows) {
    skillBreakdown[row.skillArea] = { correct: row.correct, total: row.total };
  }

  // Recent session history
  const sessionHistory = await db.select({
    skillArea: sessions.skillArea,
    score: sessions.score,
    totalQuestions: sessions.totalQuestions,
    pointsEarned: sessions.pointsEarned,
    completedAt: sessions.completedAt,
  }).from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .orderBy(desc(sessions.completedAt))
    .limit(10);

  return Response.json({
    totalSessions: totals.totalSessions,
    totalCorrect: totals.totalCorrect,
    totalAnswered: totals.totalAnswered,
    totalPoints: totals.totalPoints,
    currentStreak,
    skillBreakdown,
    sessionHistory,
  });
}
