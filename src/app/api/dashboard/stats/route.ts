import { NextRequest } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc } from 'drizzle-orm';

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

  // Verify parent owns this child
  const [child] = await db
    .select()
    .from(children)
    .where(and(eq(children.id, childId), eq(children.parentId, session.parentId)))
    .limit(1);

  if (!child) {
    return Response.json({ error: 'Child not found' }, { status: 404 });
  }

  // Completed sessions for this child
  const completedSessions = await db
    .select()
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

  // Totals
  const totalSessions = completedSessions.length;
  const totalCorrect = completedSessions.reduce((sum, s) => sum + (s.score ?? 0), 0);
  const totalAnswered = completedSessions.reduce((sum, s) => sum + (s.totalQuestions ?? 0), 0);

  // Last practiced
  const lastSession = completedSessions.length > 0
    ? completedSessions.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    : null;

  return Response.json({
    weeklyActivity,
    skillBreakdown,
    recentAvgScore,
    totalSessions,
    totalCorrect,
    totalAnswered,
    lastPracticedAt: lastSession?.completedAt ?? null,
  });
}
