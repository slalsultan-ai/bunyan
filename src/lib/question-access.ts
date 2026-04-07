import { getDb } from './db';
import { questions } from './db/schema';
import { eq, and, sql, notInArray } from 'drizzle-orm';
import { hasFeatureAccess } from './feature-flags';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccessibleQuestion {
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
  tier?: string;
  source?: string;
}

export interface QuestionBankStats {
  totalFree: number;
  totalPremium: number;
  totalAll: number;
  bySkillArea: { area: string; free: number; premium: number }[];
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Determines which questions a child can see based on tier and feature flag.
 *
 * If gat_extended_bank flag is OFF: all questions accessible (no tier distinction).
 * If flag is ON:
 *   - Free users: only tier = 'free'
 *   - Premium users (isPremium): all questions
 */
export async function getAccessibleQuestions(
  ageGroup: string,
  childId: string | null,
  options?: {
    skillArea?: string;
    subSkill?: string;
    difficulty?: string;
    excludeIds?: string[];
    limit?: number;
    parentEmail?: string | null;
  }
): Promise<AccessibleQuestion[]> {
  const db = getDb();
  const flagEnabled = await hasFeatureAccess('gat_extended_bank', options?.parentEmail);

  const conditions: ReturnType<typeof eq>[] = [
    eq(questions.ageGroup, ageGroup),
    eq(questions.isActive, true),
  ];

  // Tier filtering: only when flag is enabled and user is not premium
  if (flagEnabled) {
    // TODO: check isPremium on child when premium system is built
    const isPremium = false;
    if (!isPremium) {
      conditions.push(sql`tier = 'free'` as ReturnType<typeof eq>);
    }
  }

  if (options?.skillArea && options.skillArea !== 'mixed') {
    conditions.push(eq(questions.skillArea, options.skillArea));
  }

  if (options?.subSkill) {
    conditions.push(eq(questions.subSkill, options.subSkill));
  }

  if (options?.difficulty && options.difficulty !== 'mixed') {
    conditions.push(eq(questions.difficulty, options.difficulty));
  }

  if (options?.excludeIds && options.excludeIds.length > 0) {
    conditions.push(notInArray(questions.id, options.excludeIds) as ReturnType<typeof eq>);
  }

  const limit = options?.limit ?? 10;

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
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(limit);

  return rows;
}

/**
 * Check if a specific question is accessible to a child.
 */
export async function canAccessQuestion(
  childId: string,
  questionId: string,
  parentEmail?: string | null
): Promise<boolean> {
  const db = getDb();
  const flagEnabled = await hasFeatureAccess('gat_extended_bank', parentEmail);

  if (!flagEnabled) return true; // No tier distinction

  // TODO: check isPremium on child
  const isPremium = false;
  if (isPremium) return true;

  const [row] = await db
    .select({ tier: sql<string>`tier` })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);

  if (!row) return false;
  return (row.tier ?? 'free') === 'free';
}

/**
 * Get question bank statistics for an age group.
 */
export async function getQuestionBankStats(ageGroup: string): Promise<QuestionBankStats> {
  const db = getDb();

  const stats = await db
    .select({
      tier: sql<string>`COALESCE(tier, 'free')`,
      skillArea: questions.skillArea,
      count: sql<number>`COUNT(*)`,
    })
    .from(questions)
    .where(and(eq(questions.ageGroup, ageGroup), eq(questions.isActive, true)))
    .groupBy(sql`tier`, questions.skillArea);

  let totalFree = 0;
  let totalPremium = 0;
  const byAreaMap = new Map<string, { free: number; premium: number }>();

  for (const row of stats) {
    const tier = row.tier || 'free';
    const area = row.skillArea;
    const count = row.count;

    if (tier === 'premium') {
      totalPremium += count;
    } else {
      totalFree += count;
    }

    if (!byAreaMap.has(area)) {
      byAreaMap.set(area, { free: 0, premium: 0 });
    }
    const entry = byAreaMap.get(area)!;
    if (tier === 'premium') {
      entry.premium += count;
    } else {
      entry.free += count;
    }
  }

  const bySkillArea = [...byAreaMap.entries()].map(([area, counts]) => ({
    area,
    ...counts,
  }));

  return {
    totalFree,
    totalPremium,
    totalAll: totalFree + totalPremium,
    bySkillArea,
  };
}

/**
 * Build a tier condition for raw SQL queries.
 * Returns SQL fragment to add to WHERE clause.
 */
export async function getTierCondition(parentEmail?: string | null): Promise<string> {
  const flagEnabled = await hasFeatureAccess('gat_extended_bank', parentEmail);
  if (!flagEnabled) return ''; // No tier filtering
  // TODO: check isPremium
  return " AND (tier = 'free' OR tier IS NULL)";
}
