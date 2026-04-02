import { NextRequest } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc, or } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit-db';

export async function GET(req: NextRequest) {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(`dashboard-stats:${session.parentId}`, 30, 60);
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const childId = req.nextUrl.searchParams.get('childId');
  if (!childId) {
    return Response.json({ error: 'childId is required' }, { status: 400 });
  }

  const db = getDb();

  // Verify parent owns or follows this child
  const [child] = await db
    .select()
    .from(children)
    .where(eq(children.id, childId))
    .limit(1);

  if (!child) {
    return Response.json({ error: 'Child not found' }, { status: 404 });
  }

  // Check ownership or follower access
  const isOwner = child.parentId === session.parentId;
  if (!isOwner) {
    const [followerLink] = await db
      .select()
      .from(childParents)
      .where(and(eq(childParents.childId, childId), eq(childParents.parentId, session.parentId)))
      .limit(1);
    if (!followerLink) {
      return Response.json({ error: 'Child not found' }, { status: 404 });
    }
  }

  // Aggregate totals with a single query instead of loading all sessions
  const [totals] = await db
    .select({
      totalSessions: sql<number>`COUNT(*)`.as('totalSessions'),
      totalCorrect: sql<number>`COALESCE(SUM(${sessions.score}), 0)`.as('totalCorrect'),
      totalAnswered: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`.as('totalAnswered'),
      lastPracticedAt: sql<string>`MAX(${sessions.completedAt})`.as('lastPracticedAt'),
    })
    .from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)));

  // Weekly activity — last 4 weeks
  const weeklyActivity = await db
    .select({
      week: sql<string>`strftime('%Y-W%W', ${sessions.completedAt})`.as('week'),
      sessions: sql<number>`COUNT(*)`.as('sessions'),
      correct: sql<number>`COALESCE(SUM(${sessions.score}), 0)`.as('correct'),
      total: sql<number>`COALESCE(SUM(${sessions.totalQuestions}), 0)`.as('total'),
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.childId, childId),
        isNotNull(sessions.completedAt),
        sql`${sessions.completedAt} >= date('now', '-28 days')`
      )
    )
    .groupBy(sql`strftime('%Y-W%W', ${sessions.completedAt})`)
    .orderBy(sql`week`);

  // Skill breakdown from session_answers + questions
  const skillRows = await db
    .select({
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('correct'),
      total: sql<number>`COUNT(*)`.as('total'),
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .groupBy(questions.skillArea);

  const skillBreakdown: Record<string, { correct: number; total: number }> = {
    quantitative: { correct: 0, total: 0 },
    verbal: { correct: 0, total: 0 },
    logical_patterns: { correct: 0, total: 0 },
  };
  for (const row of skillRows) {
    if (row.skillArea in skillBreakdown) {
      skillBreakdown[row.skillArea] = { correct: row.correct, total: row.total };
    }
  }

  // Recent average score from last 10 sessions
  const recentSessions = await db
    .select({ score: sessions.score, totalQuestions: sessions.totalQuestions })
    .from(sessions)
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .orderBy(desc(sessions.completedAt))
    .limit(10);

  let recentAvgScore = 0;
  if (recentSessions.length > 0) {
    const totalScore = recentSessions.reduce((sum, s) => sum + (s.score ?? 0), 0);
    const totalQ = recentSessions.reduce((sum, s) => sum + (s.totalQuestions ?? 10), 0);
    recentAvgScore = totalQ > 0 ? Math.round((totalScore / totalQ) * 100) : 0;
  }

  return Response.json({
    weeklyActivity,
    skillBreakdown,
    recentAvgScore,
    totalSessions: totals.totalSessions,
    totalCorrect: totals.totalCorrect,
    totalAnswered: totals.totalAnswered,
    lastPracticedAt: totals.lastPracticedAt ?? null,
  });
}
