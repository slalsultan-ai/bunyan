import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun }),
}));

vi.mock('@/lib/db/schema', () => ({
  sessions: { id: 'id', childId: 'child_id', startedAt: 'started_at', completedAt: 'completed_at' },
  sessionAnswers: { sessionId: 'session_id', questionId: 'question_id', isCorrect: 'is_correct' },
  questions: {
    id: 'id', skillArea: 'skill_area', subSkill: 'sub_skill', ageGroup: 'age_group',
    difficulty: 'difficulty', questionType: 'question_type', questionTextAr: 'question_text_ar',
    questionImageUrl: 'question_image_url', options: 'options', tags: 'tags',
    isActive: 'is_active', createdAt: 'created_at',
  },
}));

vi.mock('@/lib/question-access', () => ({
  getTierCondition: vi.fn(async () => ''),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { join: (...a: unknown[]) => a, raw: (v: unknown) => v },
  ),
  eq: (a: unknown, b: unknown) => ({ a, b }),
  and: (...args: unknown[]) => args,
  desc: (col: unknown) => ({ desc: col }),
  notInArray: (col: unknown, arr: unknown[]) => ({ col, arr }),
}));

const {
  analyzeChildSkills,
  generateAdaptiveSession,
  completeAdaptiveSession,
  getPathSummary,
} = await import('@/lib/adaptive-path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    innerJoin: vi.fn(),
    then: (resolve: (v: unknown[]) => void) => resolve(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  return chain;
}

function makeQuestionRow(id: string, skillArea = 'quantitative', subSkill = 'العد') {
  return {
    id,
    skillArea,
    subSkill,
    ageGroup: '6-9',
    difficulty: 'medium',
    questionType: 'mcq',
    questionTextAr: `سؤال ${id}`,
    questionImageUrl: null,
    options: [{ text: 'أ' }, { text: 'ب' }],
    tags: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSelect.mockReset();
  mockRun.mockReset();
});

describe('analyzeChildSkills', () => {
  it('returns empty array when there are no answers', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    const result = await analyzeChildSkills('child-1');
    expect(result).toEqual([]);
  });

  it('returns skills sorted by accuracy (weakest first) with correct trend', async () => {
    // Create a midpoint date that puts some answers in the first half and some in the second
    const now = Date.now();
    const oldDate = new Date(now - 25 * 86400000).toISOString(); // ~25 days ago (first half)
    const newDate = new Date(now - 5 * 86400000).toISOString();  // ~5 days ago (second half)

    const answers = [
      // العد: 1 correct out of 4 = 25% accuracy
      // first half: 1 correct, 1 wrong => 50%
      // second half: 0 correct, 2 wrong => 0%  => declining
      { questionId: 'q1', isCorrect: true, sessionStartedAt: oldDate, skillArea: 'quantitative', subSkill: 'العد' },
      { questionId: 'q2', isCorrect: false, sessionStartedAt: oldDate, skillArea: 'quantitative', subSkill: 'العد' },
      { questionId: 'q5', isCorrect: false, sessionStartedAt: newDate, skillArea: 'quantitative', subSkill: 'العد' },
      { questionId: 'q6', isCorrect: false, sessionStartedAt: newDate, skillArea: 'quantitative', subSkill: 'العد' },
      // المفردات: 3 correct out of 4 = 75% accuracy
      // first half: 1 correct, 1 wrong => 50%
      // second half: 2 correct => 100%  => improving
      { questionId: 'q3', isCorrect: true, sessionStartedAt: oldDate, skillArea: 'verbal', subSkill: 'المفردات' },
      { questionId: 'q7', isCorrect: false, sessionStartedAt: oldDate, skillArea: 'verbal', subSkill: 'المفردات' },
      { questionId: 'q4', isCorrect: true, sessionStartedAt: newDate, skillArea: 'verbal', subSkill: 'المفردات' },
      { questionId: 'q8', isCorrect: true, sessionStartedAt: newDate, skillArea: 'verbal', subSkill: 'المفردات' },
    ];

    mockSelect.mockReturnValueOnce(makeChain(answers));

    const result = await analyzeChildSkills('child-1');

    expect(result).toHaveLength(2);
    // Weakest first
    expect(result[0].subSkill).toBe('العد');
    expect(result[0].accuracy).toBe(25);
    expect(result[0].trend).toBe('declining');
    expect(result[0].totalQuestions).toBe(4);

    expect(result[1].subSkill).toBe('المفردات');
    expect(result[1].accuracy).toBe(75);
    expect(result[1].trend).toBe('improving');
    expect(result[1].totalQuestions).toBe(4);
  });

  it('returns stable trend when not enough data in either half', async () => {
    const now = Date.now();
    const date = new Date(now - 10 * 86400000).toISOString();

    const answers = [
      { questionId: 'q1', isCorrect: true, sessionStartedAt: date, skillArea: 'quantitative', subSkill: 'العد' },
    ];

    mockSelect.mockReturnValueOnce(makeChain(answers));
    const result = await analyzeChildSkills('child-1');

    expect(result).toHaveLength(1);
    expect(result[0].trend).toBe('stable');
    expect(result[0].accuracy).toBe(100);
  });
});

describe('generateAdaptiveSession', () => {
  it('resumes existing incomplete session', async () => {
    const existingSession = {
      id: 42,
      child_id: 'c1',
      session_number: 2,
      focus_areas: '["العد"]',
      question_ids: '["q1","q2"]',
      completed: 0,
    };

    // 1st select: existing incomplete session
    mockSelect.mockReturnValueOnce(makeChain([existingSession]));
    // 2nd select: fetchQuestionsByIds
    mockSelect.mockReturnValueOnce(makeChain([
      makeQuestionRow('q1'),
      makeQuestionRow('q2'),
    ]));

    const result = await generateAdaptiveSession('c1', '6-9');

    expect(result.id).toBe(42);
    expect(result.sessionNumber).toBe(2);
    expect(result.focusAreas).toEqual(['العد']);
    expect(result.isDiagnostic).toBe(false);
    expect(result.questions).toHaveLength(2);
    expect(result.recalculateAfter).toBe(1); // 3 - (2 % 3) = 1
  });

  it('creates diagnostic session when insufficient data', async () => {
    // 1st select: no existing incomplete session
    mockSelect.mockReturnValueOnce(makeChain([]));
    // 2nd select: completed sessions count
    mockSelect.mockReturnValueOnce(makeChain([{ cnt: 0 }]));
    // 3rd select: analyzeChildSkills answers (few answers < 10)
    mockSelect.mockReturnValueOnce(makeChain([
      { questionId: 'q1', isCorrect: true, sessionStartedAt: '2026-03-20T00:00:00Z', skillArea: 'quantitative', subSkill: 'العد' },
    ]));
    // 4th-6th select: selectDiagnosticQuestions — one per skill area
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'dq1' }, { id: 'dq2' }, { id: 'dq3' }, { id: 'dq4' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'dq5' }, { id: 'dq6' }, { id: 'dq7' }, { id: 'dq8' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'dq9' }, { id: 'dq10' }]));
    // mockRun: insert adaptive session
    mockRun.mockResolvedValueOnce({ lastInsertRowid: 1n });
    // 7th select: fetchQuestionsByIds — return question rows for inserted IDs
    // We don't know exact IDs due to shuffle, so return many questions
    const allDiagQs = Array.from({ length: 10 }, (_, i) => makeQuestionRow(`dq${i + 1}`));
    mockSelect.mockReturnValueOnce(makeChain(allDiagQs));

    const result = await generateAdaptiveSession('c1', '6-9');

    expect(result.isDiagnostic).toBe(true);
    expect(result.focusAreas).toEqual(['تشخيصية']);
    expect(result.sessionNumber).toBe(1);
    expect(result.id).toBe(1);
  });

  it('creates smart session when sufficient data', async () => {
    // 1st select: no existing incomplete session
    mockSelect.mockReturnValueOnce(makeChain([]));
    // 2nd select: completed sessions count
    mockSelect.mockReturnValueOnce(makeChain([{ cnt: 5 }]));
    // 3rd select: analyzeChildSkills answers (>= 10 answers)
    const manyAnswers = Array.from({ length: 12 }, (_, i) => ({
      questionId: `q${i}`,
      isCorrect: i % 3 === 0,
      sessionStartedAt: '2026-03-20T00:00:00Z',
      skillArea: i < 4 ? 'quantitative' : i < 8 ? 'verbal' : 'logical_patterns',
      subSkill: i < 4 ? 'العد' : i < 8 ? 'المفردات' : 'الأنماط',
    }));
    mockSelect.mockReturnValueOnce(makeChain(manyAnswers));

    // selectSmartQuestions internals:
    // 4th select: recent question IDs (exclude last 7 days)
    mockSelect.mockReturnValueOnce(makeChain([]));

    // fetchForSubSkill calls — weak (up to 3 sub-skills), medium (up to 2), strong (up to 2)
    // With 3 sub-skills all at ~33% accuracy, all are weak. No medium or strong.
    // So: 3 weak fetches (2 each), then we need filler since we likely won't have 10
    // weak sub-skill fetches
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq1' }, { id: 'sq2' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq3' }, { id: 'sq4' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq5' }, { id: 'sq6' }]));
    // medium: skills.slice(1,2) — 1 sub-skill
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq7' }]));
    // strong: skills.slice(-2) — 2 sub-skills
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq8' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq9' }]));
    // filler if needed
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'sq10' }]));

    // mockRun: insert adaptive session (session_number=6, 6%3===0 so snapshot + insert)
    mockRun.mockResolvedValueOnce(undefined); // skill_snapshots insert
    mockRun.mockResolvedValueOnce({ lastInsertRowid: 10n }); // adaptive_sessions insert

    // fetchQuestionsByIds
    const smartQs = Array.from({ length: 10 }, (_, i) => makeQuestionRow(`sq${i + 1}`));
    mockSelect.mockReturnValueOnce(makeChain(smartQs));

    const result = await generateAdaptiveSession('c1', '6-9');

    expect(result.isDiagnostic).toBe(false);
    expect(result.sessionNumber).toBe(6);
    expect(result.id).toBe(10);
  });
});

describe('completeAdaptiveSession', () => {
  it('returns accuracy and needsRecalculation=true when session_number % 3 === 0', async () => {
    // mockRun: update completed
    mockRun.mockResolvedValueOnce(undefined);
    // mockSelect: fetch session to check session_number
    mockSelect.mockReturnValueOnce(makeChain([{ session_number: 3 }]));

    const result = await completeAdaptiveSession(1, [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: false },
      { questionId: 'q3', isCorrect: true },
    ]);

    expect(result.accuracy).toBe(67); // 2/3 rounded
    expect(result.needsRecalculation).toBe(true);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('returns needsRecalculation=false when session_number % 3 !== 0', async () => {
    mockRun.mockResolvedValueOnce(undefined);
    mockSelect.mockReturnValueOnce(makeChain([{ session_number: 4 }]));

    const result = await completeAdaptiveSession(2, [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
    ]);

    expect(result.accuracy).toBe(100);
    expect(result.needsRecalculation).toBe(false);
  });

  it('returns 0 accuracy when no answers provided', async () => {
    mockRun.mockResolvedValueOnce(undefined);
    mockSelect.mockReturnValueOnce(makeChain([{ session_number: 1 }]));

    const result = await completeAdaptiveSession(3, []);

    expect(result.accuracy).toBe(0);
    expect(result.needsRecalculation).toBe(false);
  });
});

describe('getPathSummary', () => {
  it('returns hasSufficientData=false when < 10 total answers', async () => {
    // analyzeChildSkills select
    mockSelect.mockReturnValueOnce(makeChain([
      { questionId: 'q1', isCorrect: true, sessionStartedAt: '2026-03-20T00:00:00Z', skillArea: 'quantitative', subSkill: 'العد' },
    ]));
    // count completed sessions
    mockSelect.mockReturnValueOnce(makeChain([{ cnt: 2 }]));

    const result = await getPathSummary('child-1');

    expect(result.hasSufficientData).toBe(false);
    expect(result.sessionsCompleted).toBe(2);
    expect(result.overallProgress).toBe(100); // 1/1 = 100%
  });

  it('returns sufficient data with focus areas when >= 10 answers', async () => {
    const now = Date.now();
    const date = new Date(now - 10 * 86400000).toISOString();

    // Create 12 answers: العد at 25% (3 questions, 1 correct) and المفردات at 100% (9 questions, 9 correct)
    const answers = [
      { questionId: 'q1', isCorrect: true, sessionStartedAt: date, skillArea: 'quantitative', subSkill: 'العد' },
      { questionId: 'q2', isCorrect: false, sessionStartedAt: date, skillArea: 'quantitative', subSkill: 'العد' },
      { questionId: 'q10', isCorrect: false, sessionStartedAt: date, skillArea: 'quantitative', subSkill: 'العد' },
      ...Array.from({ length: 9 }, (_, i) => ({
        questionId: `qv${i}`,
        isCorrect: true,
        sessionStartedAt: date,
        skillArea: 'verbal',
        subSkill: 'المفردات',
      })),
    ];

    // analyzeChildSkills select
    mockSelect.mockReturnValueOnce(makeChain(answers));
    // count completed sessions
    mockSelect.mockReturnValueOnce(makeChain([{ cnt: 5 }]));

    const result = await getPathSummary('child-1');

    expect(result.hasSufficientData).toBe(true);
    expect(result.sessionsCompleted).toBe(5);
    expect(result.nextRecalculation).toBe(1); // 3 - (5 % 3) = 1
    // Focus areas: only العد (<80%) should be listed
    expect(result.focusAreas.length).toBeGreaterThanOrEqual(1);
    expect(result.focusAreas[0].name).toBe('العد');
    expect(result.focusAreas[0].accuracy).toBe(33);
    // Overall progress = avg(33, 100) = 67
    expect(result.overallProgress).toBe(67);
  });

  it('returns empty focus areas and 0 progress when no answers at all', async () => {
    // analyzeChildSkills select — no answers
    mockSelect.mockReturnValueOnce(makeChain([]));
    // count completed sessions
    mockSelect.mockReturnValueOnce(makeChain([{ cnt: 0 }]));

    const result = await getPathSummary('child-1');

    expect(result.hasSufficientData).toBe(false);
    expect(result.focusAreas).toEqual([]);
    expect(result.overallProgress).toBe(0);
    expect(result.sessionsCompleted).toBe(0);
    expect(result.nextRecalculation).toBe(3);
  });
});
