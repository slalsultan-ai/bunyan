import { getDb } from './db';
import { sessionAnswers, sessions } from './db/schema';
import { eq, and, isNotNull, desc } from 'drizzle-orm';

export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Pure function: maps accuracy (0-100) to a difficulty level.
 *   ≥ 85% → hard
 *   < 50% → easy
 *   otherwise → medium
 * Below the minimum sample size, falls back to 'medium' (safe neutral).
 */
export function pickDifficulty(
  accuracyPct: number,
  sampleSize: number,
  minSamples = 5,
): Difficulty {
  if (sampleSize < minSamples) return 'medium';
  if (accuracyPct >= 85) return 'hard';
  if (accuracyPct < 50) return 'easy';
  return 'medium';
}

/**
 * Look at this user's last N completed answers and recommend a difficulty
 * for the next question set. Requires either childId or guestId.
 */
export async function recommendDifficulty(params: {
  childId?: string | null;
  guestId?: string | null;
  windowSize?: number;
}): Promise<{ difficulty: Difficulty; sampleSize: number; accuracy: number }> {
  const { childId, guestId } = params;
  const windowSize = params.windowSize ?? 10;

  if (!childId && !guestId) {
    return { difficulty: 'medium', sampleSize: 0, accuracy: 0 };
  }

  const db = getDb();

  // Identify ownership via sessions (sessionAnswers has no childId/guestId column).
  const ownership = childId
    ? eq(sessions.childId, childId)
    : eq(sessions.guestId, guestId!);

  const rows = await db
    .select({ isCorrect: sessionAnswers.isCorrect })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .where(and(ownership, isNotNull(sessions.completedAt), isNotNull(sessionAnswers.isCorrect)))
    .orderBy(desc(sessions.completedAt), desc(sessionAnswers.id))
    .limit(windowSize);

  if (rows.length === 0) {
    return { difficulty: 'medium', sampleSize: 0, accuracy: 0 };
  }

  const correct = rows.filter(r => r.isCorrect).length;
  const accuracy = (correct / rows.length) * 100;
  const difficulty = pickDifficulty(accuracy, rows.length);

  return {
    difficulty,
    sampleSize: rows.length,
    accuracy: Math.round(accuracy),
  };
}
