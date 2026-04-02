import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children, childParents } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc, inArray } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit-db';

const SKILL_LABELS: Record<string, string> = {
  quantitative: 'الكمي',
  verbal: 'اللفظي',
  logical_patterns: 'التفكير المنطقي',
};

export async function GET() {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(`dashboard-suggestions:${session.parentId}`, 20, 60);
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const db = getDb();

  // Owned children
  const ownedChildren = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.parentId));

  // Followed children
  const followedLinks = await db
    .select({ childId: childParents.childId })
    .from(childParents)
    .where(and(eq(childParents.parentId, session.parentId), eq(childParents.role, 'follower')));

  const followedChildIds = followedLinks.map(l => l.childId);
  const followedChildren = followedChildIds.length > 0
    ? await db.select().from(children).where(inArray(children.id, followedChildIds))
    : [];

  const childRows = [...ownedChildren, ...followedChildren];
  if (childRows.length === 0) {
    return Response.json({ suggestions: [] });
  }

  const childIds = childRows.map(c => c.id);

  // Batch: last session per child (single query instead of N)
  const lastSessions = await db
    .select({
      childId: sessions.childId,
      completedAt: sql<string>`MAX(${sessions.completedAt})`.as('completedAt'),
    })
    .from(sessions)
    .where(and(inArray(sessions.childId, childIds), isNotNull(sessions.completedAt)))
    .groupBy(sessions.childId);

  const lastSessionMap = new Map(lastSessions.map(s => [s.childId, s.completedAt]));

  // Batch: weakest skill per child (single query instead of N)
  const skillRows = await db
    .select({
      childId: sessions.childId,
      skillArea: questions.skillArea,
      correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('correct'),
      total: sql<number>`COUNT(*)`.as('total'),
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(and(inArray(sessions.childId, childIds), isNotNull(sessions.completedAt)))
    .groupBy(sessions.childId, questions.skillArea);

  // Build per-child weakest skill map
  const weakestSkillMap = new Map<string, string | null>();
  const childSkills = new Map<string, { skill: string; rate: number }[]>();
  for (const row of skillRows) {
    if (!row.childId) continue;
    const rate = row.total > 0 ? row.correct / row.total : 0;
    const arr = childSkills.get(row.childId) || [];
    arr.push({ skill: row.skillArea, rate });
    childSkills.set(row.childId, arr);
  }
  for (const [childId, skills] of childSkills) {
    const weakest = skills.reduce((min, s) => s.rate < min.rate ? s : min);
    weakestSkillMap.set(childId, weakest.skill);
  }

  // Batch: recent perfect scores (single query instead of N)
  const perfectRows = await db
    .select({
      childId: sessions.childId,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(sessions)
    .where(
      and(
        inArray(sessions.childId, childIds),
        isNotNull(sessions.completedAt),
        sql`${sessions.completedAt} >= date('now', '-7 days')`,
        sql`${sessions.score} = ${sessions.totalQuestions}`
      )
    )
    .groupBy(sessions.childId);

  const perfectMap = new Map(perfectRows.map(r => [r.childId, r.count > 0]));

  // Build suggestions from batched data
  const suggestions: Array<{
    childId: string;
    childName: string;
    type: 'warning' | 'success' | 'info';
    message: string;
    suggestedSkill?: string;
  }> = [];

  for (const child of childRows) {
    const lastCompletedAt = lastSessionMap.get(child.id);
    const weakestSkill = weakestSkillMap.get(child.id) ?? null;
    const weakestSkillLabel = weakestSkill ? (SKILL_LABELS[weakestSkill] ?? weakestSkill) : null;
    const recentPerfectScore = perfectMap.get(child.id) ?? false;

    if (!lastCompletedAt) {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'info',
        message: `${child.name} لم يبدأ بعد — ابدأوا أول جلسة معاً!`,
      });
      continue;
    }

    const now = new Date();
    const lastDate = new Date(lastCompletedAt);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (recentPerfectScore) {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'success',
        message: `ممتاز ${child.name}! جرّبوا مستوى أصعب`,
      });
    } else if (daysSince >= 3) {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'warning',
        message: `${child.name} لم يتدرب منذ ${daysSince} أيام — حان وقت العودة!`,
      });
    } else if (daysSince >= 1) {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'warning',
        message: `${child.name} لم يتدرب اليوم — جلسة ${weakestSkillLabel ?? 'قصيرة'} قصيرة ستكون مفيدة`,
        suggestedSkill: weakestSkill ?? undefined,
      });
    } else {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'success',
        message: `${child.name} لديه سلسلة رائعة! حافظوا عليها`,
      });
    }
  }

  return Response.json({ suggestions });
}
