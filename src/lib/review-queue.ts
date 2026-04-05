import { getDb } from './db';
import { reviewQueue, questions as questionsTable } from './db/schema';
import { eq, and, sql, lte } from 'drizzle-orm';

interface UserIdentifier {
  guestId?: string;
  childId?: string;
}

function userWhere(params: UserIdentifier) {
  if (params.childId) {
    return eq(reviewQueue.childId, params.childId);
  }
  if (params.guestId) {
    return eq(reviewQueue.guestId, params.guestId);
  }
  throw new Error('Either guestId or childId is required');
}

/**
 * Add a question to the review queue or increment wrong count.
 */
export async function upsertReviewItem(params: {
  guestId?: string;
  childId?: string;
  questionId: string;
  lastWrongAt: string;
}): Promise<void> {
  const db = getDb();
  const now = params.lastWrongAt;

  // Try to find existing item
  const conditions = [eq(reviewQueue.questionId, params.questionId)];
  if (params.childId) {
    conditions.push(eq(reviewQueue.childId, params.childId));
  } else if (params.guestId) {
    conditions.push(eq(reviewQueue.guestId, params.guestId));
  } else {
    return;
  }

  const [existing] = await db
    .select()
    .from(reviewQueue)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    // Update: increment wrong count, reset mastered, make available immediately
    await db
      .update(reviewQueue)
      .set({
        timesWrong: sql`times_wrong + 1`,
        lastWrongAt: now,
        nextReviewAt: now,
        mastered: 0,
        timesReviewed: 0,
      })
      .where(eq(reviewQueue.id, existing.id));
  } else {
    // Insert new item, available immediately
    await db.insert(reviewQueue).values({
      guestId: params.guestId ?? null,
      childId: params.childId ?? null,
      questionId: params.questionId,
      timesWrong: 1,
      timesReviewed: 0,
      lastWrongAt: now,
      nextReviewAt: now,
      mastered: 0,
    });
  }
}

/**
 * Spaced repetition intervals (in days) per review count.
 *   1st correct review → schedule 3 days out
 *   2nd correct review → 7 days out
 *   3rd correct review → 14 days out
 *   4th correct review → mastered
 */
const REVIEW_INTERVALS_DAYS = [3, 7, 14] as const;

/**
 * Mark progress when user answers correctly during review.
 * Uses the REVIEW_INTERVALS_DAYS schedule; masters after all intervals pass.
 */
export async function markReviewProgress(params: {
  guestId?: string;
  childId?: string;
  questionId: string;
}): Promise<void> {
  const db = getDb();

  const conditions = [eq(reviewQueue.questionId, params.questionId)];
  if (params.childId) {
    conditions.push(eq(reviewQueue.childId, params.childId));
  } else if (params.guestId) {
    conditions.push(eq(reviewQueue.guestId, params.guestId));
  } else {
    return;
  }

  const [item] = await db
    .select()
    .from(reviewQueue)
    .where(and(...conditions))
    .limit(1);

  if (!item) return;

  const newTimesReviewed = (item.timesReviewed ?? 0) + 1;

  if (newTimesReviewed > REVIEW_INTERVALS_DAYS.length) {
    // Mastered after completing all intervals
    await db
      .update(reviewQueue)
      .set({ timesReviewed: newTimesReviewed, mastered: 1 })
      .where(eq(reviewQueue.id, item.id));
  } else {
    const daysAhead = REVIEW_INTERVALS_DAYS[newTimesReviewed - 1];
    await db
      .update(reviewQueue)
      .set({
        timesReviewed: newTimesReviewed,
        nextReviewAt: sql`datetime('now', '+' || ${daysAhead} || ' days')`,
      })
      .where(eq(reviewQueue.id, item.id));
  }
}

/**
 * Get review questions that are due now.
 * ORDER BY times_wrong DESC (most wrong first), last_wrong_at ASC (oldest first)
 */
export async function getReviewQuestions(params: {
  guestId?: string;
  childId?: string;
  limit?: number;
}): Promise<Array<typeof questionsTable.$inferSelect>> {
  const db = getDb();
  const maxItems = params.limit ?? 10;

  const userCond = userWhere(params);

  // Get question IDs from review queue
  const reviewItems = await db
    .select({
      questionId: reviewQueue.questionId,
    })
    .from(reviewQueue)
    .where(and(
      userCond,
      eq(reviewQueue.mastered, 0),
      lte(reviewQueue.nextReviewAt, sql`datetime('now')`)
    ))
    .orderBy(sql`times_wrong DESC, last_wrong_at ASC`)
    .limit(maxItems);

  if (reviewItems.length === 0) return [];

  const questionIds = reviewItems.map((r) => r.questionId);

  // Fetch full question data
  const questionRows = await db
    .select()
    .from(questionsTable)
    .where(sql`${questionsTable.id} IN (${sql.join(questionIds.map(id => sql`${id}`), sql`, `)})`);

  // Preserve review order
  const questionMap = new Map(questionRows.map((q) => [q.id, q]));
  return questionIds
    .map((id) => questionMap.get(id))
    .filter((q): q is typeof questionsTable.$inferSelect => q !== undefined);
}

/**
 * Review stats for a user.
 */
export async function getReviewStats(params: {
  guestId?: string;
  childId?: string;
}): Promise<{ pending: number; mastered: number; total: number }> {
  const db = getDb();
  const userCond = userWhere(params);

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      mastered: sql<number>`SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN mastered = 0 AND next_review_at <= datetime('now') THEN 1 ELSE 0 END)`,
    })
    .from(reviewQueue)
    .where(userCond);

  return {
    total: stats?.total ?? 0,
    mastered: stats?.mastered ?? 0,
    pending: stats?.pending ?? 0,
  };
}
