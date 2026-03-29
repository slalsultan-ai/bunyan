import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { sessions, sessionAnswers, questions, children } from '@/lib/db/schema';
import { eq, and, isNotNull, sql, desc } from 'drizzle-orm';

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

  const db = getDb();
  const childRows = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.parentId));

  const suggestions: Array<{
    childId: string;
    childName: string;
    type: 'warning' | 'success' | 'info';
    message: string;
    suggestedSkill?: string;
  }> = [];

  for (const child of childRows) {
    // Last session
    const [lastSession] = await db
      .select({ completedAt: sessions.completedAt, score: sessions.score, totalQuestions: sessions.totalQuestions })
      .from(sessions)
      .where(and(eq(sessions.childId, child.id), isNotNull(sessions.completedAt)))
      .orderBy(desc(sessions.completedAt))
      .limit(1);

    // Weakest skill
    const skillRows = await db
      .select({
        skillArea: questions.skillArea,
        correct: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('correct'),
        total: sql<number>`COUNT(*)`.as('total'),
      })
      .from(sessionAnswers)
      .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
      .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
      .where(and(eq(sessions.childId, child.id), isNotNull(sessions.completedAt)))
      .groupBy(questions.skillArea);

    let weakestSkill: string | null = null;
    let lowestRate = Infinity;
    for (const row of skillRows) {
      const rate = row.total > 0 ? row.correct / row.total : 0;
      if (rate < lowestRate) {
        lowestRate = rate;
        weakestSkill = row.skillArea;
      }
    }

    const weakestSkillLabel = weakestSkill ? (SKILL_LABELS[weakestSkill] ?? weakestSkill) : null;

    // No sessions ever
    if (!lastSession) {
      suggestions.push({
        childId: child.id,
        childName: child.name,
        type: 'info',
        message: `${child.name} لم يبدأ بعد — ابدأوا أول جلسة معاً!`,
      });
      continue;
    }

    const now = new Date();
    const lastDate = new Date(lastSession.completedAt!);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recent perfect score (last 7 days)
    const [perfectRow] = await db
      .select({ count: sql<number>`COUNT(*)`.as('count') })
      .from(sessions)
      .where(
        and(
          eq(sessions.childId, child.id),
          isNotNull(sessions.completedAt),
          sql`${sessions.completedAt} >= date('now', '-7 days')`,
          sql`${sessions.score} = ${sessions.totalQuestions}`
        )
      );
    const recentPerfectScore = (perfectRow?.count ?? 0) > 0;

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
