import { getDb } from './db';
import { questions } from './db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { hasFeatureAccess } from './feature-flags';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MockTestInfo {
  id: number;
  title: string;
  description: string | null;
  ageGroup: string;
  durationMinutes: number;
  totalQuestions: number;
  difficultyMix: Record<string, number>;
  skillMix: Record<string, number>;
}

export interface MockTestQuestion {
  id: string;
  skillArea: string;
  subSkill: string;
  difficulty: string;
  questionType: string;
  questionTextAr: string;
  questionImageUrl: string | null;
  options: Array<{ text: string; imageUrl?: string }>;
  correctOptionIndex: number;
  explanationAr: string;
}

export interface MockTestSection {
  name: string;
  icon: string;
  startIndex: number;
  endIndex: number;
}

export interface MockTestFull {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  totalQuestions: number;
  questions: MockTestQuestion[];
  sections: MockTestSection[];
}

export interface MockTestResultDetail {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
  correctAnswer: string;
  skillArea: string;
  subSkill: string;
  questionText: string;
  explanation: string;
}

export interface MockTestResult {
  id: number;
  mockTestId: number;
  testTitle: string;
  score: number;
  accuracy: number;
  timeSpent: number;
  durationMinutes: number;
  status: string;
  sections: {
    name: string;
    icon: string;
    score: number;
    accuracy: number;
    totalQuestions: number;
  }[];
  percentile: number;
  grade: string;
  details: MockTestResultDetail[];
  recommendations: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SECTIONS: MockTestSection[] = [
  { name: 'القسم الكمي', icon: '🔢', startIndex: 0, endIndex: 9 },
  { name: 'القسم اللفظي', icon: '📚', startIndex: 10, endIndex: 19 },
  { name: 'القسم المنطقي', icon: '🧩', startIndex: 20, endIndex: 29 },
];

const SKILL_MAP: Record<string, string> = {
  quantitative: 'الكمي',
  verbal: 'اللفظي',
  logical_patterns: 'المنطقي',
};

// ─── Feature guard ──────────────────────────────────────────────────────────

export async function isMockTestsEnabled(parentEmail?: string | null): Promise<boolean> {
  return hasFeatureAccess('mock_tests', parentEmail);
}

// ─── Get available mock tests ───────────────────────────────────────────────

export async function getAvailableMockTests(childId: string): Promise<{
  tests: MockTestInfo[];
  completedTestIds: number[];
  bestScores: Record<number, number>;
}> {
  const db = getDb();

  const tests = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`is_active = 1`)
    .orderBy(sql`id`) as any[];

  const results = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`child_id = ${childId} AND status = 'completed'`) as any[];

  const completedTestIds = [...new Set(results.map((r: any) => r.mock_test_id as number))];
  const bestScores: Record<number, number> = {};

  for (const r of results) {
    const testId = r.mock_test_id as number;
    const accuracy = r.accuracy as number;
    if (!bestScores[testId] || accuracy > bestScores[testId]) {
      bestScores[testId] = accuracy;
    }
  }

  return {
    tests: tests.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      ageGroup: t.age_group,
      durationMinutes: t.duration_minutes,
      totalQuestions: t.total_questions,
      difficultyMix: JSON.parse(t.difficulty_mix || '{}'),
      skillMix: JSON.parse(t.skill_mix || '{}'),
    })),
    completedTestIds,
    bestScores,
  };
}

// ─── Start a mock test ──────────────────────────────────────────────────────

export async function startMockTest(childId: string, testId: number): Promise<{
  resultId: number;
  test: MockTestFull;
  startedAt: string;
  expiresAt: string;
}> {
  const db = getDb();

  // Check for existing in-progress test
  const [existing] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`child_id = ${childId} AND status = 'in_progress'`)
    .limit(1) as any[];

  if (existing) {
    throw new Error('أكمل الاختبار الحالي أولاً');
  }

  // Get the mock test
  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${testId} AND is_active = 1`)
    .limit(1) as any[];

  if (!test) {
    throw new Error('الاختبار غير موجود');
  }

  const questionIds: string[] = JSON.parse(test.question_ids);
  const qs = await fetchMockTestQuestions(questionIds);

  const startedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + test.duration_minutes * 60 * 1000).toISOString();

  const result = await db.run(
    sql`INSERT INTO mock_test_results (child_id, mock_test_id, started_at, status, answers)
        VALUES (${childId}, ${testId}, ${startedAt}, 'in_progress', '[]')`
  );

  const resultId = Number(result.lastInsertRowid);

  return {
    resultId,
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      durationMinutes: test.duration_minutes,
      totalQuestions: test.total_questions,
      questions: qs,
      sections: SECTIONS,
    },
    startedAt,
    expiresAt,
  };
}

// ─── Resume an in-progress mock test ────────────────────────────────────────

export async function resumeMockTest(childId: string): Promise<{
  resultId: number;
  test: MockTestFull;
  startedAt: string;
  expiresAt: string;
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }>;
} | null> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`child_id = ${childId} AND status = 'in_progress'`)
    .orderBy(sql`started_at DESC`)
    .limit(1) as any[];

  if (!existing) return null;

  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${existing.mock_test_id}`)
    .limit(1) as any[];

  if (!test) return null;

  const questionIds: string[] = JSON.parse(test.question_ids);
  const qs = await fetchMockTestQuestions(questionIds);
  const answers = JSON.parse(existing.answers || '[]');

  const startedAt = existing.started_at;
  const expiresAt = new Date(new Date(startedAt).getTime() + test.duration_minutes * 60 * 1000).toISOString();

  return {
    resultId: existing.id,
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      durationMinutes: test.duration_minutes,
      totalQuestions: test.total_questions,
      questions: qs,
      sections: SECTIONS,
    },
    startedAt,
    expiresAt,
    answers,
  };
}

// ─── Submit a single answer ─────────────────────────────────────────────────

export async function submitMockAnswer(
  resultId: number,
  questionId: string,
  answer: string,
  isCorrect: boolean,
  timeSpentSeconds: number
): Promise<{ saved: boolean; questionsRemaining: number }> {
  const db = getDb();

  const [result] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`id = ${resultId} AND status = 'in_progress'`)
    .limit(1) as any[];

  if (!result) {
    throw new Error('الاختبار غير موجود أو منتهي');
  }

  const answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }> =
    JSON.parse(result.answers || '[]');

  // Update existing answer or add new one
  const existingIdx = answers.findIndex((a) => a.questionId === questionId);
  const answerObj = { questionId, answer, isCorrect, timeSpent: timeSpentSeconds };

  if (existingIdx >= 0) {
    answers[existingIdx] = answerObj;
  } else {
    answers.push(answerObj);
  }

  await db.run(
    sql`UPDATE mock_test_results SET answers = ${JSON.stringify(answers)} WHERE id = ${resultId}`
  );

  // Get total questions from the test
  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${result.mock_test_id}`)
    .limit(1) as any[];

  const totalQuestions = test?.total_questions ?? 30;
  const questionsRemaining = totalQuestions - answers.length;

  return { saved: true, questionsRemaining: Math.max(0, questionsRemaining) };
}

// ─── Complete mock test ─────────────────────────────────────────────────────

export async function completeMockTest(resultId: number): Promise<MockTestResult> {
  const db = getDb();

  const [result] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`id = ${resultId}`)
    .limit(1) as any[];

  if (!result) {
    throw new Error('الاختبار غير موجود');
  }

  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${result.mock_test_id}`)
    .limit(1) as any[];

  if (!test) {
    throw new Error('بيانات الاختبار غير موجودة');
  }

  const answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }> =
    JSON.parse(result.answers || '[]');

  const questionIds: string[] = JSON.parse(test.question_ids);
  const allQuestions = await fetchMockTestQuestions(questionIds);
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  return await finalizeResult(db, resultId, result, test, answers, questionMap, 'completed');
}

// ─── Timeout mock test ──────────────────────────────────────────────────────

export async function timeoutMockTest(resultId: number): Promise<MockTestResult> {
  const db = getDb();

  const [result] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`id = ${resultId} AND status = 'in_progress'`)
    .limit(1) as any[];

  if (!result) {
    throw new Error('الاختبار غير موجود');
  }

  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${result.mock_test_id}`)
    .limit(1) as any[];

  if (!test) {
    throw new Error('بيانات الاختبار غير موجودة');
  }

  const answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }> =
    JSON.parse(result.answers || '[]');

  const questionIds: string[] = JSON.parse(test.question_ids);
  const allQuestions = await fetchMockTestQuestions(questionIds);
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  // Mark unanswered questions as incorrect
  const answeredIds = new Set(answers.map((a) => a.questionId));
  for (const qId of questionIds) {
    if (!answeredIds.has(qId)) {
      answers.push({ questionId: qId, answer: '', isCorrect: false, timeSpent: 0 });
    }
  }

  return await finalizeResult(db, resultId, result, test, answers, questionMap, 'timed_out');
}

// ─── Get a previous result ──────────────────────────────────────────────────

export async function getMockTestResult(resultId: number): Promise<MockTestResult> {
  const db = getDb();

  const [result] = await db
    .select()
    .from(sql`mock_test_results`)
    .where(sql`id = ${resultId}`)
    .limit(1) as any[];

  if (!result) {
    throw new Error('النتيجة غير موجودة');
  }

  const [test] = await db
    .select()
    .from(sql`mock_tests`)
    .where(sql`id = ${result.mock_test_id}`)
    .limit(1) as any[];

  if (!test) {
    throw new Error('بيانات الاختبار غير موجودة');
  }

  const answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }> =
    JSON.parse(result.answers || '[]');

  const questionIds: string[] = JSON.parse(test.question_ids);
  const allQuestions = await fetchMockTestQuestions(questionIds);
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  // Build result without re-saving
  return buildResult(result, test, answers, questionMap);
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function fetchMockTestQuestions(ids: string[]): Promise<MockTestQuestion[]> {
  if (ids.length === 0) return [];
  const db = getDb();

  const rows = await db
    .select({
      id: questions.id,
      skillArea: questions.skillArea,
      subSkill: questions.subSkill,
      difficulty: questions.difficulty,
      questionType: questions.questionType,
      questionTextAr: questions.questionTextAr,
      questionImageUrl: questions.questionImageUrl,
      options: questions.options,
      correctOptionIndex: questions.correctOptionIndex,
      explanationAr: questions.explanationAr,
    })
    .from(questions)
    .where(sql`id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

  // Preserve order
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)!).filter(Boolean);
}

async function finalizeResult(
  db: ReturnType<typeof getDb>,
  resultId: number,
  result: any,
  test: any,
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }>,
  questionMap: Map<string, MockTestQuestion>,
  status: string
): Promise<MockTestResult> {
  const score = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = test.total_questions;
  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const timeSpent = answers.reduce((sum, a) => sum + a.timeSpent, 0);

  // Calculate per-section scores
  const sectionScores = calculateSectionScores(answers, questionMap);
  const percentile = await calculatePercentile(result.mock_test_id, accuracy);

  await db.run(
    sql`UPDATE mock_test_results SET
      status = ${status},
      completed_at = datetime('now'),
      time_spent_seconds = ${timeSpent},
      answers = ${JSON.stringify(answers)},
      score = ${score},
      accuracy = ${accuracy},
      quantitative_score = ${sectionScores.quantitative},
      verbal_score = ${sectionScores.verbal},
      logical_score = ${sectionScores.logical},
      percentile = ${percentile}
    WHERE id = ${resultId}`
  );

  return buildResult({ ...result, score, accuracy, time_spent_seconds: timeSpent, status, quantitative_score: sectionScores.quantitative, verbal_score: sectionScores.verbal, logical_score: sectionScores.logical, percentile }, test, answers, questionMap);
}

function calculateSectionScores(
  answers: Array<{ questionId: string; isCorrect: boolean }>,
  questionMap: Map<string, MockTestQuestion>
): { quantitative: number; verbal: number; logical: number } {
  const bySkill: Record<string, { correct: number; total: number }> = {
    quantitative: { correct: 0, total: 0 },
    verbal: { correct: 0, total: 0 },
    logical_patterns: { correct: 0, total: 0 },
  };

  for (const a of answers) {
    const q = questionMap.get(a.questionId);
    if (!q) continue;
    const skill = q.skillArea;
    if (bySkill[skill]) {
      bySkill[skill].total++;
      if (a.isCorrect) bySkill[skill].correct++;
    }
  }

  const pct = (s: { correct: number; total: number }) =>
    s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;

  return {
    quantitative: pct(bySkill.quantitative),
    verbal: pct(bySkill.verbal),
    logical: pct(bySkill.logical_patterns),
  };
}

async function calculatePercentile(testId: number, accuracy: number): Promise<number> {
  const db = getDb();

  const [countRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sql`mock_test_results`)
    .where(sql`mock_test_id = ${testId} AND status IN ('completed', 'timed_out')`) as any[];

  const total = countRow?.cnt ?? 0;
  if (total === 0) return 50; // First result gets 50th percentile

  const [lowerRow] = await db
    .select({ cnt: sql<number>`COUNT(*)` })
    .from(sql`mock_test_results`)
    .where(sql`mock_test_id = ${testId} AND status IN ('completed', 'timed_out') AND accuracy < ${accuracy}`) as any[];

  const lower = lowerRow?.cnt ?? 0;
  return Math.round((lower / total) * 100);
}

export function calculateGrade(accuracy: number): string {
  if (accuracy >= 90) return 'ممتاز';
  if (accuracy >= 80) return 'جيد جداً';
  if (accuracy >= 70) return 'جيد';
  if (accuracy >= 60) return 'مقبول';
  return 'يحتاج تحسين';
}

export function generateRecommendations(result: {
  accuracy: number;
  quantitative_score: number;
  verbal_score: number;
  logical_score: number;
  time_spent_seconds: number;
  durationMinutes: number;
}): string[] {
  const recs: string[] = [];

  const sections = [
    { name: 'الكمي', accuracy: result.quantitative_score },
    { name: 'اللفظي', accuracy: result.verbal_score },
    { name: 'المنطقي', accuracy: result.logical_score },
  ].sort((a, b) => b.accuracy - a.accuracy);

  // Strongest section
  recs.push(`القسم ${sections[0].name} ممتاز (${sections[0].accuracy}%) — استمر!`);

  // Weakest section
  if (sections[2].accuracy < 70) {
    recs.push(`القسم ${sections[2].name} يحتاج تركيز أكثر (${sections[2].accuracy}%).`);
  }

  // Time feedback
  const timeMinutes = result.time_spent_seconds / 60;
  if (timeMinutes < result.durationMinutes * 0.5) {
    recs.push('أنهيت الاختبار بسرعة — خذ وقتك في مراجعة إجاباتك.');
  }

  // Next step
  if (result.accuracy >= 80) {
    recs.push('جرّب اختبار أصعب لتتحدّى نفسك!');
  } else {
    recs.push('راجع نقاط الضعف وأعد الاختبار لتحسين درجتك.');
  }

  return recs;
}

function buildResult(
  result: any,
  test: any,
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean; timeSpent: number }>,
  questionMap: Map<string, MockTestQuestion>
): MockTestResult {
  const score = result.score ?? answers.filter((a) => a.isCorrect).length;
  const totalQuestions = test.total_questions;
  const accuracy = result.accuracy ?? (totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0);
  const timeSpent = result.time_spent_seconds ?? answers.reduce((sum, a) => sum + a.timeSpent, 0);

  const quantitative_score = result.quantitative_score ?? 0;
  const verbal_score = result.verbal_score ?? 0;
  const logical_score = result.logical_score ?? 0;
  const percentile = result.percentile ?? 50;

  const sectionResults = [
    { name: 'القسم الكمي', icon: '🔢', skill: 'quantitative', score: 0, total: 0 },
    { name: 'القسم اللفظي', icon: '📚', skill: 'verbal', score: 0, total: 0 },
    { name: 'القسم المنطقي', icon: '🧩', skill: 'logical_patterns', score: 0, total: 0 },
  ];

  for (const a of answers) {
    const q = questionMap.get(a.questionId);
    if (!q) continue;
    const sec = sectionResults.find((s) => s.skill === q.skillArea);
    if (sec) {
      sec.total++;
      if (a.isCorrect) sec.score++;
    }
  }

  const details: MockTestResultDetail[] = answers.map((a) => {
    const q = questionMap.get(a.questionId);
    return {
      questionId: a.questionId,
      answer: a.answer,
      isCorrect: a.isCorrect,
      timeSpent: a.timeSpent,
      correctAnswer: q ? q.options[q.correctOptionIndex]?.text ?? '' : '',
      skillArea: q?.skillArea ?? '',
      subSkill: q?.subSkill ?? '',
      questionText: q?.questionTextAr ?? '',
      explanation: q?.explanationAr ?? '',
    };
  });

  const recommendations = generateRecommendations({
    accuracy,
    quantitative_score,
    verbal_score,
    logical_score,
    time_spent_seconds: timeSpent,
    durationMinutes: test.duration_minutes,
  });

  return {
    id: result.id,
    mockTestId: result.mock_test_id ?? test.id,
    testTitle: test.title,
    score,
    accuracy,
    timeSpent,
    durationMinutes: test.duration_minutes,
    status: result.status,
    sections: sectionResults.map((s) => ({
      name: s.name,
      icon: s.icon,
      score: s.score,
      accuracy: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
      totalQuestions: s.total,
    })),
    percentile,
    grade: calculateGrade(accuracy),
    details,
    recommendations,
  };
}
