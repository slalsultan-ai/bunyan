import { getParentSession } from '@/lib/parent-auth';
import { getDb } from '@/lib/db';
import { weeklyChallenges, challengeProgress, children, childParents, sessions, sessionAnswers } from '@/lib/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

const ROTATING_CHALLENGES = [
  { goalType: 'sessions', goalTarget: 5, titleAr: 'أكملوا ٥ جلسات هذا الأسبوع' },
  { goalType: 'correct_answers', goalTarget: 30, titleAr: 'أجيبوا على ٣٠ سؤالاً صحيحاً' },
  { goalType: 'sessions', goalTarget: 7, titleAr: 'تدربوا كل يوم هذا الأسبوع' },
  { goalType: 'correct_answers', goalTarget: 50, titleAr: 'حققوا ٥٠ إجابة صحيحة' },
];

function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  date.setDate(date.getDate() + diff);
  return date.toISOString().split('T')[0];
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

export async function GET() {
  const session = await getParentSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const weekStart = getMonday(now);
  const weekNum = getWeekNumber(now);

  // Find or create challenge for this week
  let [challenge] = await db
    .select()
    .from(weeklyChallenges)
    .where(eq(weeklyChallenges.weekStart, weekStart))
    .limit(1);

  if (!challenge) {
    const template = ROTATING_CHALLENGES[weekNum % 4];
    const id = crypto.randomUUID();
    await db.insert(weeklyChallenges).values({
      id,
      weekStart,
      goalType: template.goalType,
      goalTarget: template.goalTarget,
      titleAr: template.titleAr,
    });
    [challenge] = await db
      .select()
      .from(weeklyChallenges)
      .where(eq(weeklyChallenges.id, id))
      .limit(1);
  }

  // Get parent's owned + followed children
  const ownedChildren = await db
    .select()
    .from(children)
    .where(eq(children.parentId, session.parentId));

  const followedLinks = await db
    .select({ childId: childParents.childId })
    .from(childParents)
    .where(and(eq(childParents.parentId, session.parentId), eq(childParents.role, 'follower')));

  const followedChildren = [];
  for (const link of followedLinks) {
    const [child] = await db.select().from(children).where(eq(children.id, link.childId)).limit(1);
    if (child) followedChildren.push(child);
  }

  const childRows = [...ownedChildren, ...followedChildren];

  // Build progress for each child
  const progress: Array<{ childId: string; childName: string; currentValue: number; completed: boolean }> = [];
  let familyTotal = 0;

  for (const child of childRows) {
    // Ensure progress row exists
    let [prog] = await db
      .select()
      .from(challengeProgress)
      .where(and(eq(challengeProgress.challengeId, challenge.id), eq(challengeProgress.childId, child.id)))
      .limit(1);

    // Compute current value from actual data
    let currentValue = 0;
    if (challenge.goalType === 'sessions') {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(sessions)
        .where(
          and(
            eq(sessions.childId, child.id),
            isNotNull(sessions.completedAt),
            sql`${sessions.completedAt} >= ${weekStart}`,
            sql`${sessions.completedAt} < date(${weekStart}, '+7 days')`
          )
        );
      currentValue = row?.count ?? 0;
    } else {
      // correct_answers
      const [row] = await db
        .select({ count: sql<number>`SUM(CASE WHEN ${sessionAnswers.isCorrect} = 1 THEN 1 ELSE 0 END)`.as('count') })
        .from(sessionAnswers)
        .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
        .where(
          and(
            eq(sessions.childId, child.id),
            isNotNull(sessions.completedAt),
            sql`${sessions.completedAt} >= ${weekStart}`,
            sql`${sessions.completedAt} < date(${weekStart}, '+7 days')`
          )
        );
      currentValue = row?.count ?? 0;
    }

    const completed = currentValue >= challenge.goalTarget;

    // Upsert progress row
    if (!prog) {
      await db.insert(challengeProgress).values({
        id: crypto.randomUUID(),
        challengeId: challenge.id,
        childId: child.id,
        currentValue,
        completedAt: completed ? new Date().toISOString() : null,
      });
    } else {
      await db
        .update(challengeProgress)
        .set({
          currentValue,
          completedAt: completed && !prog.completedAt ? new Date().toISOString() : prog.completedAt,
        })
        .where(eq(challengeProgress.id, prog.id));
    }

    progress.push({
      childId: child.id,
      childName: child.name,
      currentValue,
      completed,
    });

    familyTotal += currentValue;
  }

  const familyCompleted = childRows.length > 0 && progress.every(p => p.completed);

  return Response.json({
    challenge: {
      id: challenge.id,
      titleAr: challenge.titleAr,
      goalType: challenge.goalType,
      goalTarget: challenge.goalTarget,
    },
    progress,
    familyTotal,
    familyCompleted,
  });
}
