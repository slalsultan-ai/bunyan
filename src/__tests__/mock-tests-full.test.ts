import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun }),
}));

vi.mock('@/lib/db/schema', () => ({
  questions: {
    id: 'id',
    skillArea: 'skill_area',
    subSkill: 'sub_skill',
    difficulty: 'difficulty',
    questionType: 'question_type',
    questionTextAr: 'question_text_ar',
    questionImageUrl: 'question_image_url',
    options: 'options',
    correctOptionIndex: 'correct_option_index',
    explanationAr: 'explanation_ar',
  },
}));

const mockHasFeatureAccess = vi.fn(async () => true);
vi.mock('@/lib/feature-flags', () => ({
  hasFeatureAccess: (...args: unknown[]) => mockHasFeatureAccess(...args),
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    { join: (...a: unknown[]) => a, raw: (v: unknown) => v },
  ),
  eq: (a: unknown, b: unknown) => ({ a, b }),
  and: (...args: unknown[]) => args,
}));

const {
  isMockTestsEnabled,
  getAvailableMockTests,
  startMockTest,
  submitMockAnswer,
  completeMockTest,
  timeoutMockTest,
  getMockTestResult,
  calculateGrade,
  generateRecommendations,
} = await import('@/lib/mock-tests');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (v: unknown[]) => void) => resolve(result),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

const MOCK_TEST_ROW = {
  id: 1,
  title: 'اختبار 1',
  description: 'test',
  age_group: '10-12',
  duration_minutes: 30,
  total_questions: 3,
  question_ids: '["q1","q2","q3"]',
  difficulty_mix: '{}',
  skill_mix: '{}',
  is_active: 1,
};

const MOCK_RESULT_ROW = {
  id: 1,
  child_id: 'c1',
  mock_test_id: 1,
  started_at: '2026-01-01T00:00:00Z',
  status: 'in_progress',
  answers: '[]',
  score: null,
  accuracy: null,
};

const QUESTION_ROW = {
  id: 'q1',
  skillArea: 'quantitative',
  subSkill: 'عد',
  difficulty: 'easy',
  questionType: 'text',
  questionTextAr: 'سؤال 1',
  questionImageUrl: null,
  options: [{ text: 'أ' }, { text: 'ب' }, { text: 'ج' }, { text: 'د' }],
  correctOptionIndex: 0,
  explanationAr: 'شرح',
};

function makeQuestionRow(id: string, skillArea = 'quantitative') {
  return { ...QUESTION_ROW, id, skillArea };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRun.mockResolvedValue({ lastInsertRowid: 1n });
});

describe('isMockTestsEnabled', () => {
  it('returns true when feature is enabled', async () => {
    mockHasFeatureAccess.mockResolvedValueOnce(true);
    expect(await isMockTestsEnabled('test@email.com', 'parent-1')).toBe(true);
    expect(mockHasFeatureAccess).toHaveBeenCalledWith('mock_tests', 'test@email.com', 'parent-1');
  });

  it('returns false when feature is disabled', async () => {
    mockHasFeatureAccess.mockResolvedValueOnce(false);
    expect(await isMockTestsEnabled()).toBe(false);
  });
});

describe('calculateGrade', () => {
  it('returns ممتاز for >= 90', () => {
    expect(calculateGrade(90)).toBe('ممتاز');
    expect(calculateGrade(100)).toBe('ممتاز');
  });

  it('returns جيد جداً for >= 80', () => {
    expect(calculateGrade(80)).toBe('جيد جداً');
    expect(calculateGrade(89)).toBe('جيد جداً');
  });

  it('returns جيد for >= 70', () => {
    expect(calculateGrade(70)).toBe('جيد');
  });

  it('returns مقبول for >= 60', () => {
    expect(calculateGrade(60)).toBe('مقبول');
  });

  it('returns يحتاج تحسين for < 60', () => {
    expect(calculateGrade(59)).toBe('يحتاج تحسين');
    expect(calculateGrade(0)).toBe('يحتاج تحسين');
  });
});

describe('generateRecommendations', () => {
  it('returns recommendations including strongest section', () => {
    const recs = generateRecommendations({
      accuracy: 85,
      quantitative_score: 90,
      verbal_score: 80,
      logical_score: 70,
      time_spent_seconds: 600,
      durationMinutes: 30,
    });
    expect(recs[0]).toContain('الكمي');
    expect(recs[0]).toContain('90%');
  });

  it('warns about weak section below 70%', () => {
    const recs = generateRecommendations({
      accuracy: 60,
      quantitative_score: 80,
      verbal_score: 60,
      logical_score: 40,
      time_spent_seconds: 1200,
      durationMinutes: 30,
    });
    expect(recs.some((r) => r.includes('يحتاج تركيز'))).toBe(true);
  });

  it('warns about rushing when time < 50% of duration', () => {
    const recs = generateRecommendations({
      accuracy: 70,
      quantitative_score: 70,
      verbal_score: 70,
      logical_score: 70,
      time_spent_seconds: 300, // 5 min out of 30 min
      durationMinutes: 30,
    });
    expect(recs.some((r) => r.includes('بسرعة'))).toBe(true);
  });

  it('suggests harder test when accuracy >= 80', () => {
    const recs = generateRecommendations({
      accuracy: 85,
      quantitative_score: 85,
      verbal_score: 85,
      logical_score: 85,
      time_spent_seconds: 1200,
      durationMinutes: 30,
    });
    expect(recs.some((r) => r.includes('أصعب'))).toBe(true);
  });

  it('suggests review when accuracy < 80', () => {
    const recs = generateRecommendations({
      accuracy: 60,
      quantitative_score: 60,
      verbal_score: 60,
      logical_score: 60,
      time_spent_seconds: 1200,
      durationMinutes: 30,
    });
    expect(recs.some((r) => r.includes('راجع'))).toBe(true);
  });
});

describe('getAvailableMockTests', () => {
  it('returns tests, completedTestIds, and bestScores', async () => {
    const testsChain = makeChain([MOCK_TEST_ROW]);
    const resultsChain = makeChain([
      { mock_test_id: 1, accuracy: 80 },
      { mock_test_id: 1, accuracy: 90 },
    ]);
    mockSelect
      .mockReturnValueOnce(testsChain)
      .mockReturnValueOnce(resultsChain);

    const out = await getAvailableMockTests('c1');

    expect(out.tests).toHaveLength(1);
    expect(out.tests[0].id).toBe(1);
    expect(out.tests[0].title).toBe('اختبار 1');
    expect(out.tests[0].ageGroup).toBe('10-12');
    expect(out.tests[0].durationMinutes).toBe(30);
    expect(out.tests[0].totalQuestions).toBe(3);
    expect(out.completedTestIds).toEqual([1]);
    expect(out.bestScores[1]).toBe(90);
  });

  it('returns empty when no tests exist', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]));

    const out = await getAvailableMockTests('c1');
    expect(out.tests).toHaveLength(0);
    expect(out.completedTestIds).toEqual([]);
    expect(out.bestScores).toEqual({});
  });
});

describe('startMockTest', () => {
  it('succeeds when no in-progress test exists', async () => {
    // 1st select: existing in_progress → empty
    // 2nd select: mock_tests → test row
    // 3rd select: fetchMockTestQuestions → question rows
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]))
      .mockReturnValueOnce(
        makeChain([
          makeQuestionRow('q1', 'quantitative'),
          makeQuestionRow('q2', 'verbal'),
          makeQuestionRow('q3', 'logical_patterns'),
        ]),
      );

    mockRun.mockResolvedValueOnce({ lastInsertRowid: 42n });

    const out = await startMockTest('c1', 1);

    expect(out.resultId).toBe(42);
    expect(out.test.id).toBe(1);
    expect(out.test.title).toBe('اختبار 1');
    expect(out.test.durationMinutes).toBe(30);
    expect(out.test.totalQuestions).toBe(3);
    expect(out.test.questions).toHaveLength(3);
    expect(out.test.sections).toHaveLength(3);
    expect(out.startedAt).toBeDefined();
    expect(out.expiresAt).toBeDefined();
  });

  it('throws when in-progress test exists', async () => {
    mockSelect.mockReturnValueOnce(makeChain([MOCK_RESULT_ROW]));

    await expect(startMockTest('c1', 1)).rejects.toThrow('أكمل الاختبار الحالي أولاً');
  });

  it('throws when test not found', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([]));

    await expect(startMockTest('c1', 999)).rejects.toThrow('الاختبار غير موجود');
  });
});

describe('submitMockAnswer', () => {
  it('adds a new answer and returns remaining count', async () => {
    // 1st select: mock_test_results → result row
    const resultRow = { ...MOCK_RESULT_ROW, answers: '[]' };
    mockSelect
      .mockReturnValueOnce(makeChain([resultRow]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]));

    mockRun.mockResolvedValueOnce(undefined);

    const out = await submitMockAnswer(1, 'q1', 'أ', true, 10);

    expect(out.saved).toBe(true);
    expect(out.questionsRemaining).toBe(2); // 3 total - 1 answered
    expect(mockRun).toHaveBeenCalled();
  });

  it('updates an existing answer', async () => {
    const existingAnswers = JSON.stringify([
      { questionId: 'q1', answer: 'ب', isCorrect: false, timeSpent: 5 },
    ]);
    const resultRow = { ...MOCK_RESULT_ROW, answers: existingAnswers };
    mockSelect
      .mockReturnValueOnce(makeChain([resultRow]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]));

    mockRun.mockResolvedValueOnce(undefined);

    const out = await submitMockAnswer(1, 'q1', 'أ', true, 10);

    expect(out.saved).toBe(true);
    // Still 1 answer total so 3 - 1 = 2
    expect(out.questionsRemaining).toBe(2);
  });

  it('throws when result not found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await expect(submitMockAnswer(999, 'q1', 'أ', true, 10)).rejects.toThrow(
      'الاختبار غير موجود أو منتهي',
    );
  });
});

describe('completeMockTest', () => {
  it('finalizes and returns result with percentile', async () => {
    const answersJson = JSON.stringify([
      { questionId: 'q1', answer: 'أ', isCorrect: true, timeSpent: 10 },
      { questionId: 'q2', answer: 'ب', isCorrect: false, timeSpent: 15 },
      { questionId: 'q3', answer: 'أ', isCorrect: true, timeSpent: 12 },
    ]);
    const resultRow = { ...MOCK_RESULT_ROW, answers: answersJson };

    // 1st: mock_test_results
    // 2nd: mock_tests
    // 3rd: questions (fetchMockTestQuestions)
    // 4th: percentile total count
    // 5th: percentile lower count
    mockSelect
      .mockReturnValueOnce(makeChain([resultRow]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]))
      .mockReturnValueOnce(
        makeChain([
          makeQuestionRow('q1', 'quantitative'),
          makeQuestionRow('q2', 'verbal'),
          makeQuestionRow('q3', 'logical_patterns'),
        ]),
      )
      .mockReturnValueOnce(makeChain([{ cnt: 5 }]))
      .mockReturnValueOnce(makeChain([{ cnt: 3 }]));

    mockRun.mockResolvedValueOnce(undefined);

    const out = await completeMockTest(1);

    expect(out.id).toBe(1);
    expect(out.score).toBe(2);
    expect(out.accuracy).toBe(67); // Math.round(2/3*100)
    expect(out.timeSpent).toBe(37); // 10+15+12
    expect(out.status).toBe('completed');
    expect(out.percentile).toBe(60); // Math.round(3/5*100)
    expect(out.grade).toBe('مقبول');
    expect(out.sections).toHaveLength(3);
    expect(out.details).toHaveLength(3);
    expect(out.recommendations.length).toBeGreaterThan(0);
    expect(mockRun).toHaveBeenCalled();
  });

  it('throws when result not found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await expect(completeMockTest(999)).rejects.toThrow('الاختبار غير موجود');
  });

  it('throws when test data not found', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([MOCK_RESULT_ROW]))
      .mockReturnValueOnce(makeChain([]));

    await expect(completeMockTest(1)).rejects.toThrow('بيانات الاختبار غير موجودة');
  });
});

describe('timeoutMockTest', () => {
  it('marks unanswered questions as incorrect and finalizes', async () => {
    // Only q1 was answered; q2, q3 should become incorrect
    const answersJson = JSON.stringify([
      { questionId: 'q1', answer: 'أ', isCorrect: true, timeSpent: 10 },
    ]);
    const resultRow = { ...MOCK_RESULT_ROW, answers: answersJson };

    mockSelect
      .mockReturnValueOnce(makeChain([resultRow]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]))
      .mockReturnValueOnce(
        makeChain([
          makeQuestionRow('q1', 'quantitative'),
          makeQuestionRow('q2', 'verbal'),
          makeQuestionRow('q3', 'logical_patterns'),
        ]),
      )
      .mockReturnValueOnce(makeChain([{ cnt: 5 }]))
      .mockReturnValueOnce(makeChain([{ cnt: 1 }]));

    mockRun.mockResolvedValueOnce(undefined);

    const out = await timeoutMockTest(1);

    expect(out.status).toBe('timed_out');
    expect(out.score).toBe(1); // Only q1 correct
    expect(out.accuracy).toBe(33); // Math.round(1/3*100)
    expect(out.details).toHaveLength(3);
    // Unanswered should have empty answer and isCorrect false
    const unanswered = out.details.filter((d) => d.answer === '');
    expect(unanswered).toHaveLength(2);
    unanswered.forEach((d) => {
      expect(d.isCorrect).toBe(false);
      expect(d.timeSpent).toBe(0);
    });
  });

  it('throws when result not found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await expect(timeoutMockTest(999)).rejects.toThrow('الاختبار غير موجود');
  });

  it('throws when test data not found', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([MOCK_RESULT_ROW]))
      .mockReturnValueOnce(makeChain([]));

    await expect(timeoutMockTest(1)).rejects.toThrow('بيانات الاختبار غير موجودة');
  });
});

describe('getMockTestResult', () => {
  it('returns full result details', async () => {
    const answersJson = JSON.stringify([
      { questionId: 'q1', answer: 'أ', isCorrect: true, timeSpent: 10 },
    ]);
    const resultRow = {
      ...MOCK_RESULT_ROW,
      status: 'completed',
      answers: answersJson,
      score: 1,
      accuracy: 33,
      time_spent_seconds: 10,
      quantitative_score: 100,
      verbal_score: 0,
      logical_score: 0,
      percentile: 50,
    };

    mockSelect
      .mockReturnValueOnce(makeChain([resultRow]))
      .mockReturnValueOnce(makeChain([MOCK_TEST_ROW]))
      .mockReturnValueOnce(
        makeChain([
          makeQuestionRow('q1', 'quantitative'),
          makeQuestionRow('q2', 'verbal'),
          makeQuestionRow('q3', 'logical_patterns'),
        ]),
      );

    const out = await getMockTestResult(1);

    expect(out.id).toBe(1);
    expect(out.mockTestId).toBe(1);
    expect(out.testTitle).toBe('اختبار 1');
    expect(out.score).toBe(1);
    expect(out.accuracy).toBe(33);
    expect(out.status).toBe('completed');
    expect(out.details).toHaveLength(1);
    expect(out.details[0].correctAnswer).toBe('أ');
    expect(out.details[0].explanation).toBe('شرح');
  });

  it('throws when result not found', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    await expect(getMockTestResult(999)).rejects.toThrow('النتيجة غير موجودة');
  });

  it('throws when test data not found', async () => {
    mockSelect
      .mockReturnValueOnce(makeChain([{ ...MOCK_RESULT_ROW, status: 'completed' }]))
      .mockReturnValueOnce(makeChain([]));

    await expect(getMockTestResult(1)).rejects.toThrow('بيانات الاختبار غير موجودة');
  });
});
