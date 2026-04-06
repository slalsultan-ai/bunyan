import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockRun = vi.fn().mockResolvedValue({ lastInsertRowid: 1 });

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

const { analyzeChildSkills, getPathSummary, completeAdaptiveSession } = await import('@/lib/adaptive-path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const terminal = Object.assign([...result], {
    limit: vi.fn().mockResolvedValue(result),
    orderBy: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown[]) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(result).then(resolve, reject);
    },
  });

  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue(terminal),
        }),
        where: vi.fn().mockReturnValue(terminal),
      }),
      where: vi.fn().mockReturnValue(terminal),
      groupBy: vi.fn().mockReturnValue(terminal),
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('analyzeChildSkills', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no answers', async () => {
    mockSelect.mockReturnValue(makeChain([]));
    const result = await analyzeChildSkills('child-1');
    expect(result).toEqual([]);
  });

  it('calculates accuracy per sub-skill', async () => {
    mockSelect.mockReturnValue(makeChain([
      { questionId: 'q1', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'quantitative', subSkill: 'الطرح' },
      { questionId: 'q2', isCorrect: false, sessionStartedAt: '2026-04-01', skillArea: 'quantitative', subSkill: 'الطرح' },
      { questionId: 'q3', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'quantitative', subSkill: 'الطرح' },
      { questionId: 'q4', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
      { questionId: 'q5', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
    ]));

    const result = await analyzeChildSkills('child-1');

    expect(result.length).toBe(2);

    // Sorted weakest first
    const tarah = result.find(s => s.subSkill === 'الطرح');
    const antonyms = result.find(s => s.subSkill === 'المتضادات');

    expect(tarah).toBeDefined();
    expect(tarah!.accuracy).toBe(67); // 2/3
    expect(tarah!.totalQuestions).toBe(3);

    expect(antonyms).toBeDefined();
    expect(antonyms!.accuracy).toBe(100); // 2/2
    expect(antonyms!.totalQuestions).toBe(2);

    // Weakest first
    expect(result[0].accuracy).toBeLessThanOrEqual(result[1].accuracy);
  });

  it('detects improving trend when second half is better', async () => {
    const now = Date.now();
    const oldDate = new Date(now - 25 * 86400000).toISOString(); // 25 days ago
    const newDate = new Date(now - 5 * 86400000).toISOString();  // 5 days ago

    mockSelect.mockReturnValue(makeChain([
      // First half: 1/3 correct (33%)
      { questionId: 'q1', isCorrect: false, sessionStartedAt: oldDate, skillArea: 'quantitative', subSkill: 'الجمع' },
      { questionId: 'q2', isCorrect: false, sessionStartedAt: oldDate, skillArea: 'quantitative', subSkill: 'الجمع' },
      { questionId: 'q3', isCorrect: true, sessionStartedAt: oldDate, skillArea: 'quantitative', subSkill: 'الجمع' },
      // Second half: 3/3 correct (100%)
      { questionId: 'q4', isCorrect: true, sessionStartedAt: newDate, skillArea: 'quantitative', subSkill: 'الجمع' },
      { questionId: 'q5', isCorrect: true, sessionStartedAt: newDate, skillArea: 'quantitative', subSkill: 'الجمع' },
      { questionId: 'q6', isCorrect: true, sessionStartedAt: newDate, skillArea: 'quantitative', subSkill: 'الجمع' },
    ]));

    const result = await analyzeChildSkills('child-1');
    expect(result[0].trend).toBe('improving');
  });
});

describe('getPathSummary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns hasSufficientData=false when no data', async () => {
    // analyzeChildSkills returns []
    mockSelect.mockReturnValue(makeChain([]));

    const summary = await getPathSummary('child-1');
    expect(summary.hasSufficientData).toBe(false);
    expect(summary.sessionsCompleted).toBe(0);
    expect(summary.overallProgress).toBe(0);
  });

  it('returns correct summary with data', async () => {
    // First call: analyzeChildSkills → answers
    mockSelect
      .mockReturnValueOnce(makeChain([
        { questionId: 'q1', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'quantitative', subSkill: 'الجمع' },
        { questionId: 'q2', isCorrect: false, sessionStartedAt: '2026-04-01', skillArea: 'quantitative', subSkill: 'الجمع' },
        { questionId: 'q3', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q4', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q5', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q6', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q7', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q8', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q9', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q10', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
        { questionId: 'q11', isCorrect: true, sessionStartedAt: '2026-04-01', skillArea: 'verbal', subSkill: 'المتضادات' },
      ]))
      // Second call: count completed adaptive sessions
      .mockReturnValueOnce(makeChain([{ cnt: 5 }]));

    const summary = await getPathSummary('child-1');
    expect(summary.hasSufficientData).toBe(true);
    expect(summary.sessionsCompleted).toBe(5);
    expect(summary.overallProgress).toBeGreaterThan(0);
    // Focus areas should include weak sub-skills
    expect(Array.isArray(summary.focusAreas)).toBe(true);
  });
});

describe('completeAdaptiveSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates accuracy and marks session complete', async () => {
    mockRun.mockResolvedValue({ lastInsertRowid: 1 });
    // For the select after update
    mockSelect.mockReturnValue(makeChain([{
      id: 1,
      child_id: 'c1',
      session_number: 3,
      completed: 1,
    }]));

    const result = await completeAdaptiveSession(1, [
      { questionId: 'q1', isCorrect: true },
      { questionId: 'q2', isCorrect: true },
      { questionId: 'q3', isCorrect: false },
      { questionId: 'q4', isCorrect: true },
      { questionId: 'q5', isCorrect: false },
    ]);

    expect(result.accuracy).toBe(60);
    // session_number 3 % 3 === 0 → needs recalculation
    expect(result.needsRecalculation).toBe(true);
  });

  it('returns needsRecalculation=false for non-milestone sessions', async () => {
    mockRun.mockResolvedValue({ lastInsertRowid: 1 });
    mockSelect.mockReturnValue(makeChain([{
      id: 2,
      child_id: 'c1',
      session_number: 4,
      completed: 1,
    }]));

    const result = await completeAdaptiveSession(2, [
      { questionId: 'q1', isCorrect: true },
    ]);

    expect(result.accuracy).toBe(100);
    expect(result.needsRecalculation).toBe(false);
  });
});
