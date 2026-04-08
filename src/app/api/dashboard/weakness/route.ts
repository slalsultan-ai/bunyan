import { NextRequest } from 'next/server';
import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, or } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit-db';
import { hasFeatureAccess } from '@/lib/feature-flags';

const MIN_ANSWERS = 3;

/**
 * Returns the child's weakest sub-skill (lowest accuracy with at least
 * MIN_ANSWERS attempts). Used by the dashboard's "3-minute quick session" card.
 * Gated by `quick_weakness` feature flag.
 */
export async function GET(req: NextRequest) {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await hasFeatureAccess('quick_weakness', session.email, session.parentId);
  if (!hasAccess) {
    return Response.json({ weakness: null }, { status: 200 });
  }

  const rl = await checkRateLimit(`dashboard-weakness:${session.parentId}`, 30, 60);
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
    .where(and(
      eq(children.id, childId),
      or(
        eq(children.parentId, session.parentId),
        sql`${children.id} IN (SELECT ${childParents.childId} FROM ${childParents} WHERE ${childParents.parentId} = ${session.parentId})`
      ),
    ))
    .limit(1);

  if (!child) {
    return Response.json({ error: 'Child not found' }, { status: 404 });
  }

  // Aggregate accuracy per sub-skill across all completed sessions for this child.
  const rows = await db
    .select({
      subSkill: questions.subSkill,
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(eq(sessions.childId, childId), isNotNull(sessions.completedAt)))
    .groupBy(questions.subSkill, questions.skillArea);

  const eligible = rows
    .filter(r => r.total >= MIN_ANSWERS)
    .map(r => ({
      subSkill: r.subSkill,
      skillArea: r.skillArea,
      accuracy: Math.round((r.correct / r.total) * 100),
      total: r.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  if (eligible.length === 0) {
    return Response.json({ weakness: null, ageGroup: child.ageGroup });
  }

  return Response.json({
    weakness: eligible[0],
    ageGroup: child.ageGroup,
  });
}
