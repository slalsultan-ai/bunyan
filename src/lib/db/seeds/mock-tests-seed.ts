import { getDb } from '../index';
import { questions } from '../schema';
import { sql, eq, and } from 'drizzle-orm';

/**
 * Creates 4 pre-built mock tests, each with 30 questions (10 quantitative + 10 verbal + 10 logical).
 * Questions are selected from the existing bank for age group 10-12.
 */

const MOCK_TESTS = [
  { title: 'اختبار محاكاة 1', description: 'تعرّف على الاختبار — أسئلة متوسطة الصعوبة', difficultyBias: 'medium' },
  { title: 'اختبار محاكاة 2', description: 'تحدّي المستوى — أسئلة متنوعة الصعوبة', difficultyBias: 'mixed' },
  { title: 'اختبار محاكاة 3', description: 'الاختبار الشامل — توزيع مثل GAT الفعلي', difficultyBias: 'gat' },
  { title: 'اختبار محاكاة 4', description: 'اختبار التميّز — أسئلة أصعب', difficultyBias: 'hard' },
];

const SKILLS = ['quantitative', 'verbal', 'logical_patterns'] as const;

async function selectQuestions(
  usedIds: Set<string>,
  skillArea: string,
  difficultyBias: string,
  count: number
): Promise<string[]> {
  const db = getDb();

  // Determine difficulty distribution per 10 questions
  let distribution: { easy: number; medium: number; hard: number };
  switch (difficultyBias) {
    case 'medium':
      distribution = { easy: 3, medium: 5, hard: 2 };
      break;
    case 'hard':
      distribution = { easy: 1, medium: 3, hard: 6 };
      break;
    case 'gat':
      distribution = { easy: 3, medium: 4, hard: 3 };
      break;
    default: // mixed
      distribution = { easy: 3, medium: 4, hard: 3 };
  }

  const ids: string[] = [];
  const excludeList = [...usedIds];

  for (const [difficulty, needed] of Object.entries(distribution)) {
    const excludeClause = excludeList.length > 0
      ? sql` AND id NOT IN (${sql.join(excludeList.map((id) => sql`${id}`), sql`, `)})`
      : sql``;

    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        sql`age_group = '10-12' AND skill_area = ${skillArea} AND difficulty = ${difficulty} AND is_active = 1${excludeClause}`
      )
      .orderBy(sql`RANDOM()`)
      .limit(needed);

    for (const r of rows) {
      ids.push(r.id);
      excludeList.push(r.id);
    }
  }

  // If not enough from specific difficulties, fill with any available
  if (ids.length < count) {
    const remaining = count - ids.length;
    const excludeClause = excludeList.length > 0
      ? sql` AND id NOT IN (${sql.join(excludeList.map((id) => sql`${id}`), sql`, `)})`
      : sql``;

    const filler = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        sql`age_group = '10-12' AND skill_area = ${skillArea} AND is_active = 1${excludeClause}`
      )
      .orderBy(sql`RANDOM()`)
      .limit(remaining);

    for (const r of filler) {
      ids.push(r.id);
      excludeList.push(r.id);
    }
  }

  // Last resort: reuse questions if not enough available
  if (ids.length < count) {
    const remaining = count - ids.length;
    const currentExclude = ids.length > 0
      ? sql` AND id NOT IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`
      : sql``;

    const reused = await db
      .select({ id: questions.id })
      .from(questions)
      .where(
        sql`age_group = '10-12' AND skill_area = ${skillArea} AND is_active = 1${currentExclude}`
      )
      .orderBy(sql`RANDOM()`)
      .limit(remaining);

    for (const r of reused) {
      ids.push(r.id);
    }
  }

  return ids;
}

export async function seedMockTests(): Promise<void> {
  const db = getDb();
  const globalUsedIds = new Set<string>();

  for (const mockTest of MOCK_TESTS) {
    const allQuestionIds: string[] = [];

    // Select 10 questions per skill area
    for (const skill of SKILLS) {
      const ids = await selectQuestions(globalUsedIds, skill, mockTest.difficultyBias, 10);
      allQuestionIds.push(...ids);
      ids.forEach((id) => globalUsedIds.add(id));
    }

    if (allQuestionIds.length === 0) {
      console.log(`Skipping ${mockTest.title}: no questions available`);
      continue;
    }

    // Build difficulty and skill mix from actual selected questions
    const selectedQuestions = await db
      .select({ difficulty: questions.difficulty, skillArea: questions.skillArea })
      .from(questions)
      .where(sql`id IN (${sql.join(allQuestionIds.map((id) => sql`${id}`), sql`, `)})`);

    const difficultyMix: Record<string, number> = {};
    const skillMix: Record<string, number> = {};

    for (const q of selectedQuestions) {
      difficultyMix[q.difficulty] = (difficultyMix[q.difficulty] || 0) + 1;
      skillMix[q.skillArea] = (skillMix[q.skillArea] || 0) + 1;
    }

    await db.run(
      sql`INSERT INTO mock_tests (title, description, age_group, duration_minutes, total_questions, question_ids, difficulty_mix, skill_mix, is_active)
          VALUES (${mockTest.title}, ${mockTest.description}, '10-12', 30, ${allQuestionIds.length}, ${JSON.stringify(allQuestionIds)}, ${JSON.stringify(difficultyMix)}, ${JSON.stringify(skillMix)}, 1)`
    );

    console.log(`Created ${mockTest.title} with ${allQuestionIds.length} questions`);
  }
}
