import { getDb } from './db';
import { questions } from './db/schema';
import { eq, and, sql, notInArray } from 'drizzle-orm';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DailyChallenge {
  date: string; // 'YYYY-MM-DD'
  ageGroup: string;
  questions: Array<{
    id: string;
    skillArea: string;
    subSkill: string;
    ageGroup: string;
    difficulty: string;
    questionType: string;
    questionTextAr: string;
    questionImageUrl: string | null;
    options: Array<{ text: string; imageUrl?: string }>;
    tags: string[] | null;
    isActive: boolean | null;
    createdAt: string | null;
  }>;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalStars: number;
  totalBadges: number;
  completedToday: boolean;
}

export interface ChallengeCompletion {
  allCorrect: boolean;
  earnedStar: boolean;
  newStreak: number;
  earnedBadge: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get today's date in Riyadh timezone (YYYY-MM-DD) */
export function getTodayRiyadh(): string {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
}

/** Get yesterday's date in Riyadh timezone */
function getYesterdayRiyadh(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
}

const SKILL_AREAS = ['quantitative', 'verbal', 'logical_patterns'] as const;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Get or create the daily challenge for a given age group.
 * Same challenge for all children in the same age group on the same day.
 */
export async function getOrCreateDailyChallenge(ageGroup: string): Promise<DailyChallenge> {
  const db = getDb();
  const today = getTodayRiyadh();

  // Check if challenge already exists for today + age group
  const [existing] = await db
    .select()
    .from(sql`daily_challenges`)
    .where(sql`challenge_date = ${today} AND age_group = ${ageGroup}`)
    .limit(1) as any[];

  if (existing) {
    const questionIds: string[] = JSON.parse(existing.question_ids);
    const qs = await fetchQuestionsByIds(questionIds);
    return { date: today, ageGroup, questions: qs };
  }

  // Generate new challenge
  const questionIds = await selectChallengeQuestions(ageGroup, today);

  await db.run(
    sql`INSERT OR IGNORE INTO daily_challenges (challenge_date, age_group, question_ids) VALUES (${today}, ${ageGroup}, ${JSON.stringify(questionIds)})`
  );

  const qs = await fetchQuestionsByIds(questionIds);
  return { date: today, ageGroup, questions: qs };
}

/**
 * Select 3 challenge questions:
 * - 1 quantitative, 1 verbal, 1 logical_patterns
 * - Different difficulty levels
 * - Not used in challenges in the last 14 days
 */
export async function selectChallengeQuestions(ageGroup: string, date?: string): Promise<string[]> {
  const db = getDb();
  const today = date || getTodayRiyadh();

  // Get question IDs used in the last 14 challenges for this age group
  const recentChallenges = await db
    .select()
    .from(sql`daily_challenges`)
    .where(sql`age_group = ${ageGroup} AND challenge_date >= date(${today}, '-14 days')`) as any[];

  const usedIds = new Set<string>();
  for (const c of recentChallenges) {
    try {
      const ids: string[] = JSON.parse(c.question_ids);
      ids.forEach((id) => usedIds.add(id));
    } catch { /* skip malformed */ }
  }

  // If not enough questions available, widen the window to 30 days
  let excludeIds = [...usedIds];

  const selectedIds: string[] = [];
  const usedDifficulties: string[] = [];

  for (const skill of SKILL_AREAS) {
    // Pick a difficulty that differs from the previously selected one
    const availableDiffs = DIFFICULTIES.filter((d) => !usedDifficulties.includes(d));
    const targetDiff = availableDiffs.length > 0
      ? availableDiffs[Math.floor(Math.random() * availableDiffs.length)]
      : DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];

    // Try to find a question with the target difficulty first
    let question = await findQuestion(db, ageGroup, skill, targetDiff, excludeIds);

    // Fallback: any difficulty for this skill
    if (!question) {
      question = await findQuestion(db, ageGroup, skill, null, excludeIds);
    }

    // Last resort: ignore exclusion list
    if (!question) {
      question = await findQuestion(db, ageGroup, skill, targetDiff, []);
    }

    if (!question) {
      question = await findQuestion(db, ageGroup, skill, null, []);
    }

    if (question) {
      selectedIds.push(question.id);
      excludeIds.push(question.id);
      usedDifficulties.push(question.difficulty);
    }
  }

  return selectedIds;
}

async function findQuestion(
  db: ReturnType<typeof getDb>,
  ageGroup: string,
  skillArea: string,
  difficulty: string | null,
  excludeIds: string[]
): Promise<{ id: string; difficulty: string } | null> {
  const diffClause = difficulty ? sql` AND difficulty = ${difficulty}` : sql``;
  const excludeClause = excludeIds.length > 0
    ? sql` AND id NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`
    : sql``;

  const [row] = await db
    .select({ id: questions.id, difficulty: questions.difficulty })
    .from(questions)
    .where(sql`age_group = ${ageGroup} AND skill_area = ${skillArea} AND is_active = 1${diffClause}${excludeClause}`)
    .orderBy(sql`RANDOM()`)
    .limit(1) as any[];

  return row || null;
}

async function fetchQuestionsByIds(ids: string[]): Promise<DailyChallenge['questions']> {
  if (ids.length === 0) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: questions.id,
      skillArea: questions.skillArea,
      subSkill: questions.subSkill,
      ageGroup: questions.ageGroup,
      difficulty: questions.difficulty,
      questionType: questions.questionType,
      questionTextAr: questions.questionTextAr,
      questionImageUrl: questions.questionImageUrl,
      options: questions.options,
      tags: questions.tags,
      isActive: questions.isActive,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .where(sql`id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);

  // Preserve the order of IDs
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)!).filter(Boolean);
}

/**
 * Submit a single challenge answer.
 */
export async function submitChallengeAnswer(
  childId: string,
  challengeDate: string,
  questionId: string,
  answer: string,
  isCorrect: boolean
): Promise<void> {
  const db = getDb();
  await db.run(
    sql`INSERT OR REPLACE INTO daily_challenge_results (child_id, challenge_date, question_id, answer, is_correct, answered_at) VALUES (${childId}, ${challengeDate}, ${questionId}, ${answer}, ${isCorrect ? 1 : 0}, datetime('now'))`
  );
}

/**
 * Complete the daily challenge after all 3 questions are answered.
 * Returns star/badge/streak info.
 */
export async function completeDailyChallenge(
  childId: string,
  challengeDate: string
): Promise<ChallengeCompletion> {
  const db = getDb();

  // Count answers for this challenge
  const results = await db
    .select()
    .from(sql`daily_challenge_results`)
    .where(sql`child_id = ${childId} AND challenge_date = ${challengeDate}`) as any[];

  if (results.length < 3) {
    return { allCorrect: false, earnedStar: false, newStreak: 0, earnedBadge: false };
  }

  const correctCount = results.filter((r: any) => r.is_correct === 1).length;
  const allCorrect = correctCount === 3;

  // Completing the challenge (regardless of correctness) earns a star
  const earnedStar = true;

  // Get or create streak record
  const [streak] = await db
    .select()
    .from(sql`daily_streaks`)
    .where(sql`child_id = ${childId}`)
    .limit(1) as any[];

  const yesterday = getYesterdayRiyadh();
  let currentStreak: number;
  let longestStreak: number;
  let totalStars: number;
  let totalBadges: number;

  if (!streak) {
    // First ever completion
    currentStreak = 1;
    longestStreak = 1;
    totalStars = 1;
    totalBadges = 0;
  } else if (streak.last_completed_date === challengeDate) {
    // Already completed today — no change
    return {
      allCorrect,
      earnedStar: false,
      newStreak: streak.current_streak,
      earnedBadge: false,
    };
  } else if (streak.last_completed_date === yesterday) {
    // Consecutive day
    currentStreak = (streak.current_streak || 0) + 1;
    longestStreak = Math.max(streak.longest_streak || 0, currentStreak);
    totalStars = (streak.total_stars || 0) + 1;
    totalBadges = streak.total_badges || 0;
  } else {
    // Streak broken
    currentStreak = 1;
    longestStreak = Math.max(streak.longest_streak || 0, 1);
    totalStars = (streak.total_stars || 0) + 1;
    totalBadges = streak.total_badges || 0;
  }

  // Badge every 7 consecutive days
  const earnedBadge = currentStreak > 0 && currentStreak % 7 === 0;
  if (earnedBadge) {
    totalBadges += 1;
  }

  // Upsert streak
  await db.run(
    sql`INSERT INTO daily_streaks (child_id, current_streak, longest_streak, total_stars, total_badges, last_completed_date, updated_at)
        VALUES (${childId}, ${currentStreak}, ${longestStreak}, ${totalStars}, ${totalBadges}, ${challengeDate}, datetime('now'))
        ON CONFLICT(child_id) DO UPDATE SET
          current_streak = ${currentStreak},
          longest_streak = ${longestStreak},
          total_stars = ${totalStars},
          total_badges = ${totalBadges},
          last_completed_date = ${challengeDate},
          updated_at = datetime('now')`
  );

  return { allCorrect, earnedStar, newStreak: currentStreak, earnedBadge };
}

/**
 * Get streak info for a child.
 */
export async function getStreakInfo(childId: string): Promise<StreakInfo> {
  const db = getDb();
  const today = getTodayRiyadh();

  const [streak] = await db
    .select()
    .from(sql`daily_streaks`)
    .where(sql`child_id = ${childId}`)
    .limit(1) as any[];

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalStars: 0,
      totalBadges: 0,
      completedToday: false,
    };
  }

  return {
    currentStreak: streak.current_streak || 0,
    longestStreak: streak.longest_streak || 0,
    totalStars: streak.total_stars || 0,
    totalBadges: streak.total_badges || 0,
    completedToday: streak.last_completed_date === today,
  };
}
