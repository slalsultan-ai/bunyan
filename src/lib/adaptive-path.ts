import { getDb } from './db';
import { sessions, sessionAnswers, questions } from './db/schema';
import { sql, eq, and, desc } from 'drizzle-orm';
import { getTierCondition } from './question-access';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillScore {
  skillArea: string;
  subSkill: string;
  accuracy: number; // 0-100
  totalQuestions: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AdaptiveSession {
  id: number;
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
  focusAreas: string[];
  sessionNumber: number;
  recalculateAfter: number;
  isDiagnostic: boolean;
}

export interface PathSummary {
  focusAreas: Array<{ name: string; accuracy: number; trend: string }>;
  sessionsCompleted: number;
  nextRecalculation: number;
  overallProgress: number;
  hasSufficientData: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_ANSWERS_FOR_PATH = 10;
const RECALCULATE_EVERY = 3;
const RECENT_DAYS = 30;
const EXCLUDE_DAYS = 7;
const SESSION_SIZE = 10;

// Distribution: 60% weak, 20% medium, 20% strong
const WEAK_COUNT = 6;
const MED_COUNT = 2;
const STRONG_COUNT = 2;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayRiyadh(): string {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Analyze a child's performance per sub-skill over the last 30 days.
 */
export async function analyzeChildSkills(childId: string): Promise<SkillScore[]> {
  const db = getDb();

  // Get all answers for this child in the last 30 days
  const answers = await db
    .select({
      questionId: sessionAnswers.questionId,
      isCorrect: sessionAnswers.isCorrect,
      sessionStartedAt: sessions.startedAt,
      skillArea: questions.skillArea,
      subSkill: questions.subSkill,
    })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .innerJoin(questions, eq(sessionAnswers.questionId, questions.id))
    .where(
      and(
        eq(sessions.childId, childId),
        sql`sessions.completed_at IS NOT NULL`,
        sql`sessions.started_at >= datetime('now', '-${RECENT_DAYS} days')`
      )
    );

  if (answers.length === 0) return [];

  // Group by sub-skill
  const bySubSkill = new Map<string, {
    skillArea: string;
    subSkill: string;
    answers: Array<{ isCorrect: boolean | null; startedAt: string | null }>;
  }>();

  for (const a of answers) {
    const key = `${a.skillArea}::${a.subSkill}`;
    if (!bySubSkill.has(key)) {
      bySubSkill.set(key, { skillArea: a.skillArea, subSkill: a.subSkill, answers: [] });
    }
    bySubSkill.get(key)!.answers.push({
      isCorrect: a.isCorrect,
      startedAt: a.sessionStartedAt,
    });
  }

  // Calculate accuracy and trend for each sub-skill
  const midpoint = new Date(Date.now() - (RECENT_DAYS / 2) * 86400000).toISOString();
  const scores: SkillScore[] = [];

  for (const [, data] of bySubSkill) {
    const total = data.answers.length;
    const correct = data.answers.filter((a) => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Calculate trend: compare first half vs second half
    const firstHalf = data.answers.filter((a) => (a.startedAt ?? '') < midpoint);
    const secondHalf = data.answers.filter((a) => (a.startedAt ?? '') >= midpoint);

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (firstHalf.length >= 2 && secondHalf.length >= 2) {
      const firstAcc = firstHalf.filter((a) => a.isCorrect).length / firstHalf.length * 100;
      const secondAcc = secondHalf.filter((a) => a.isCorrect).length / secondHalf.length * 100;
      const diff = secondAcc - firstAcc;
      if (diff > 10) trend = 'improving';
      else if (diff < -10) trend = 'declining';
    }

    scores.push({
      skillArea: data.skillArea,
      subSkill: data.subSkill,
      accuracy,
      totalQuestions: total,
      trend,
    });
  }

  // Sort weakest first
  scores.sort((a, b) => a.accuracy - b.accuracy);
  return scores;
}

/**
 * Generate an adaptive session for a child.
 * If insufficient data, returns a diagnostic session.
 */
export async function generateAdaptiveSession(
  childId: string,
  ageGroup: string
): Promise<AdaptiveSession> {
  const db = getDb();

  // Check for incomplete adaptive session
  const [existing] = await db
    .select()
    .from(sql`adaptive_sessions`)
    .where(sql`child_id = ${childId} AND completed = 0`)
    .orderBy(sql`created_at DESC`)
    .limit(1) as any[];

  if (existing) {
    const questionIds: string[] = JSON.parse(existing.question_ids);
    const qs = await fetchQuestionsByIds(questionIds);
    return {
      id: existing.id,
      questions: qs,
      focusAreas: JSON.parse(existing.focus_areas),
      sessionNumber: existing.session_number,
      recalculateAfter: RECALCULATE_EVERY - (existing.session_number % RECALCULATE_EVERY),
      isDiagnostic: false,
    };
  }

  // Count completed adaptive sessions
  const [countRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sql`adaptive_sessions`)
    .where(sql`child_id = ${childId} AND completed = 1`) as any[];
  const sessionsCompleted = countRow?.cnt ?? 0;

  const skills = await analyzeChildSkills(childId);
  const totalAnswers = skills.reduce((sum, s) => sum + s.totalQuestions, 0);
  const isDiagnostic = totalAnswers < MIN_ANSWERS_FOR_PATH;

  let questionIds: string[];
  let focusAreas: string[];

  if (isDiagnostic) {
    // Diagnostic: balanced across main skill areas
    questionIds = await selectDiagnosticQuestions(ageGroup);
    focusAreas = ['تشخيصية'];
  } else {
    // Smart session: focus on weaknesses
    const result = await selectSmartQuestions(skills, ageGroup, childId);
    questionIds = result.questionIds;
    focusAreas = result.focusAreas;
  }

  const sessionNumber = sessionsCompleted + 1;

  // Check if we need to recalculate (every 3 sessions)
  const needsSnapshot = sessionNumber > 0 && sessionNumber % RECALCULATE_EVERY === 0;
  if (needsSnapshot && skills.length > 0) {
    const today = getTodayRiyadh();
    await db.run(
      sql`INSERT INTO skill_snapshots (child_id, snapshot_date, skills_data)
          VALUES (${childId}, ${today}, ${JSON.stringify(skills)})`
    );
  }

  // Create adaptive session record
  const result = await db.run(
    sql`INSERT INTO adaptive_sessions (child_id, session_number, focus_areas, question_ids)
        VALUES (${childId}, ${sessionNumber}, ${JSON.stringify(focusAreas)}, ${JSON.stringify(questionIds)})`
  );

  const sessionId = Number(result.lastInsertRowid);
  const qs = await fetchQuestionsByIds(questionIds);

  return {
    id: sessionId,
    questions: qs,
    focusAreas,
    sessionNumber,
    recalculateAfter: RECALCULATE_EVERY - (sessionNumber % RECALCULATE_EVERY),
    isDiagnostic,
  };
}

/**
 * Select balanced diagnostic questions across all skill areas.
 */
async function selectDiagnosticQuestions(ageGroup: string): Promise<string[]> {
  const db = getDb();
  const skillAreas = ['quantitative', 'verbal', 'logical_patterns'];
  const perSkill = Math.ceil(SESSION_SIZE / skillAreas.length);
  const allIds: string[] = [];
  const tierClause = await getTierCondition();

  for (const skill of skillAreas) {
    const tierSql = tierClause ? sql.raw(tierClause) : sql``;
    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        sql`age_group = ${ageGroup} AND skill_area = ${skill} AND is_active = 1${tierSql}`
      )
      .orderBy(sql`RANDOM()`)
      .limit(perSkill);
    allIds.push(...rows.map((r) => r.id));
  }

  // Shuffle and trim
  return allIds.sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE);
}

/**
 * Select questions weighted by weakness.
 * 60% weak, 20% medium, 20% strong sub-skills.
 */
async function selectSmartQuestions(
  skills: SkillScore[],
  ageGroup: string,
  childId: string
): Promise<{ questionIds: string[]; focusAreas: string[] }> {
  const db = getDb();

  // Categorize sub-skills
  const weak = skills.filter((s) => s.accuracy < 60);
  const medium = skills.filter((s) => s.accuracy >= 60 && s.accuracy < 80);
  const strong = skills.filter((s) => s.accuracy >= 80);

  // Get recently seen question IDs (last 7 days)
  const recentRows = await db
    .select({ questionId: sessionAnswers.questionId })
    .from(sessionAnswers)
    .innerJoin(sessions, eq(sessionAnswers.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.childId, childId),
        sql`sessions.started_at >= datetime('now', '-${EXCLUDE_DAYS} days')`
      )
    );
  const recentIds = new Set(recentRows.map((r) => r.questionId));

  const questionIds: string[] = [];
  const focusAreas: string[] = [];

  const tierClause = await getTierCondition();

  // Helper to fetch questions for a sub-skill
  async function fetchForSubSkill(subSkill: string, skillArea: string, count: number): Promise<string[]> {
    const tierSql = tierClause ? sql.raw(tierClause) : sql``;
    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        sql`age_group = ${ageGroup} AND skill_area = ${skillArea} AND sub_skill = ${subSkill} AND is_active = 1${tierSql}`
      )
      .orderBy(sql`RANDOM()`)
      .limit(count * 3); // Fetch extra to filter out recent
    return rows.map((r) => r.id).filter((id) => !recentIds.has(id)).slice(0, count);
  }

  // Fetch from weak sub-skills (6 questions)
  let remaining = WEAK_COUNT;
  const weakSubSkills = weak.length > 0 ? weak : skills.slice(0, 3);
  const perWeak = Math.max(1, Math.ceil(remaining / Math.min(weakSubSkills.length, 3)));
  for (const s of weakSubSkills.slice(0, 3)) {
    if (remaining <= 0) break;
    const take = Math.min(perWeak, remaining);
    const ids = await fetchForSubSkill(s.subSkill, s.skillArea, take);
    questionIds.push(...ids);
    remaining -= ids.length;
    if (ids.length > 0) focusAreas.push(s.subSkill);
  }

  // Fetch from medium sub-skills (2 questions)
  remaining = MED_COUNT;
  const medSubSkills = medium.length > 0 ? medium : skills.slice(Math.floor(skills.length / 3), Math.floor(skills.length * 2 / 3));
  for (const s of medSubSkills.slice(0, 2)) {
    if (remaining <= 0) break;
    const ids = await fetchForSubSkill(s.subSkill, s.skillArea, 1);
    questionIds.push(...ids);
    remaining -= ids.length;
  }

  // Fetch from strong sub-skills (2 questions for reinforcement)
  remaining = STRONG_COUNT;
  const strongSubSkills = strong.length > 0 ? strong : skills.slice(-2);
  for (const s of strongSubSkills.slice(0, 2)) {
    if (remaining <= 0) break;
    const ids = await fetchForSubSkill(s.subSkill, s.skillArea, 1);
    questionIds.push(...ids);
    remaining -= ids.length;
  }

  // If we don't have enough, fill with random questions
  if (questionIds.length < SESSION_SIZE) {
    const excludeList = [...questionIds, ...recentIds];
    const excludeClause = excludeList.length > 0
      ? sql` AND id NOT IN (${sql.join(excludeList.map(id => sql`${id}`), sql`, `)})`
      : sql``;
    const tierSql = tierClause ? sql.raw(tierClause) : sql``;
    const filler = await db
      .select({ id: questions.id })
      .from(questions)
      .where(sql`age_group = ${ageGroup} AND is_active = 1${excludeClause}${tierSql}`)
      .orderBy(sql`RANDOM()`)
      .limit(SESSION_SIZE - questionIds.length);
    questionIds.push(...filler.map((r) => r.id));
  }

  // Shuffle final list
  return {
    questionIds: questionIds.sort(() => Math.random() - 0.5).slice(0, SESSION_SIZE),
    focusAreas: [...new Set(focusAreas)],
  };
}

async function fetchQuestionsByIds(ids: string[]): Promise<AdaptiveSession['questions']> {
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

  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)!).filter(Boolean);
}

/**
 * Complete an adaptive session and record results.
 */
export async function completeAdaptiveSession(
  sessionId: number,
  answers: Array<{ questionId: string; isCorrect: boolean }>
): Promise<{ accuracy: number; needsRecalculation: boolean }> {
  const db = getDb();

  const correct = answers.filter((a) => a.isCorrect).length;
  const accuracy = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;

  await db.run(
    sql`UPDATE adaptive_sessions SET completed = 1, accuracy = ${accuracy}, completed_at = datetime('now')
        WHERE id = ${sessionId}`
  );

  // Check if recalculation is needed
  const [session] = await db
    .select()
    .from(sql`adaptive_sessions`)
    .where(sql`id = ${sessionId}`)
    .limit(1) as any[];

  const needsRecalculation = session && session.session_number % RECALCULATE_EVERY === 0;

  return { accuracy, needsRecalculation };
}

/**
 * Get path summary for a child.
 */
export async function getPathSummary(childId: string): Promise<PathSummary> {
  const db = getDb();

  const skills = await analyzeChildSkills(childId);
  const totalAnswers = skills.reduce((sum, s) => sum + s.totalQuestions, 0);
  const hasSufficientData = totalAnswers >= MIN_ANSWERS_FOR_PATH;

  // Count completed adaptive sessions
  const [countRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sql`adaptive_sessions`)
    .where(sql`child_id = ${childId} AND completed = 1`) as any[];
  const sessionsCompleted = countRow?.cnt ?? 0;

  const nextRecalculation = RECALCULATE_EVERY - (sessionsCompleted % RECALCULATE_EVERY);

  // Overall progress: average accuracy across all skills
  const overallProgress = skills.length > 0
    ? Math.round(skills.reduce((sum, s) => sum + s.accuracy, 0) / skills.length)
    : 0;

  // Focus areas: weakest 3 sub-skills
  const focusAreas = skills
    .filter((s) => s.accuracy < 80)
    .slice(0, 3)
    .map((s) => ({ name: s.subSkill, accuracy: s.accuracy, trend: s.trend }));

  return {
    focusAreas,
    sessionsCompleted,
    nextRecalculation,
    overallProgress,
    hasSufficientData,
  };
}
