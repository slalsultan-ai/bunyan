import { getDb } from './db';
import { questionMastery } from './db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';

const RETIREMENT_THRESHOLD = 5;

/**
 * Increment correct_count for a question/user pair.
 */
export async function upsertMasteryProgress(params: {
  guestId?: string;
  childId?: string;
  questionId: string;
}): Promise<void> {
  const db = getDb();

  const conditions = [eq(questionMastery.questionId, params.questionId)];
  if (params.childId) {
    conditions.push(eq(questionMastery.childId, params.childId));
  } else if (params.guestId) {
    conditions.push(eq(questionMastery.guestId, params.guestId));
  } else {
    return;
  }

  const [existing] = await db
    .select()
    .from(questionMastery)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    await db
      .update(questionMastery)
      .set({
        correctCount: sql`correct_count + 1`,
        lastCorrectAt: sql`datetime('now')`,
      })
      .where(eq(questionMastery.id, existing.id));
  } else {
    await db.insert(questionMastery).values({
      guestId: params.guestId ?? null,
      childId: params.childId ?? null,
      questionId: params.questionId,
      correctCount: 1,
    });
  }
}

/**
 * Get question IDs that a user has mastered (correct_count >= threshold).
 */
export async function getRetiredQuestionIds(params: {
  guestId?: string;
  childId?: string;
}): Promise<string[]> {
  const db = getDb();

  let userCond;
  if (params.childId) {
    userCond = eq(questionMastery.childId, params.childId);
  } else if (params.guestId) {
    userCond = eq(questionMastery.guestId, params.guestId);
  } else {
    return [];
  }

  const rows = await db
    .select({ questionId: questionMastery.questionId })
    .from(questionMastery)
    .where(and(userCond, gte(questionMastery.correctCount, RETIREMENT_THRESHOLD)));

  return rows.map((r) => r.questionId);
}
