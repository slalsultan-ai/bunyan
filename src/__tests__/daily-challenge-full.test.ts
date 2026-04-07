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
  getTodayRiyadh,
  getOrCreateDailyChallenge,
  selectChallengeQuestions,
  submitChallengeAnswer,
  completeDailyChallenge,
  getStreakInfo,
} = await import('@/lib/daily-challenge');

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

function makeQuestionRow(id: string, skillArea = 'quantitative', difficulty = 'medium') {
  return {
    id,
    skillArea,
    subSkill: 'العد',
    ageGroup: '6-9',
    difficulty,
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

describe('getTodayRiyadh', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getTodayRiyadh();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getOrCreateDailyChallenge', () => {
  it('returns existing challenge when one exists for today', async () => {
    const today = getTodayRiyadh();

    // 1st select: existing challenge row
    mockSelect.mockReturnValueOnce(makeChain([{
      challenge_date: today,
      age_group: '6-9',
      question_ids: '["q1","q2","q3"]',
    }]));
    // 2nd select: fetchQuestionsByIds
    mockSelect.mockReturnValueOnce(makeChain([
      makeQuestionRow('q1', 'quantitative'),
      makeQuestionRow('q2', 'verbal'),
      makeQuestionRow('q3', 'logical_patterns'),
    ]));

    const result = await getOrCreateDailyChallenge('6-9');

    expect(result.date).toBe(today);
    expect(result.ageGroup).toBe('6-9');
    expect(result.questions).toHaveLength(3);
  });

  it('creates new challenge when none exists', async () => {
    // 1st select: no existing challenge
    mockSelect.mockReturnValueOnce(makeChain([]));
    // selectChallengeQuestions internals:
    // 2nd select: recent challenges (empty)
    mockSelect.mockReturnValueOnce(makeChain([]));
    // 3rd-5th select: findQuestion per skill (3 skills)
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'nq1', difficulty: 'easy' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'nq2', difficulty: 'medium' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'nq3', difficulty: 'hard' }]));
    // mockRun: INSERT challenge
    mockRun.mockResolvedValueOnce(undefined);
    // 6th select: fetchQuestionsByIds
    mockSelect.mockReturnValueOnce(makeChain([
      makeQuestionRow('nq1', 'quantitative', 'easy'),
      makeQuestionRow('nq2', 'verbal', 'medium'),
      makeQuestionRow('nq3', 'logical_patterns', 'hard'),
    ]));

    const result = await getOrCreateDailyChallenge('6-9');

    expect(result.questions.length).toBeGreaterThanOrEqual(1);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});

describe('selectChallengeQuestions', () => {
  it('returns up to 3 question IDs (one per skill area)', async () => {
    // 1st select: recent challenges (empty — no exclusions)
    mockSelect.mockReturnValueOnce(makeChain([]));
    // 2nd-4th select: findQuestion for each of the 3 skill areas
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q1', difficulty: 'easy' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q2', difficulty: 'medium' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q3', difficulty: 'hard' }]));

    const result = await selectChallengeQuestions('6-9', '2026-04-07');

    expect(result).toHaveLength(3);
    expect(result).toEqual(['q1', 'q2', 'q3']);
  });

  it('falls back when primary difficulty not found', async () => {
    // recent challenges empty
    mockSelect.mockReturnValueOnce(makeChain([]));
    // 1st skill: target difficulty fails, fallback (any difficulty) succeeds
    mockSelect.mockReturnValueOnce(makeChain([])); // target diff — empty
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'fb1', difficulty: 'hard' }])); // fallback any diff
    // 2nd skill: succeeds
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q2', difficulty: 'medium' }]));
    // 3rd skill: succeeds
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q3', difficulty: 'easy' }]));

    const result = await selectChallengeQuestions('6-9', '2026-04-07');

    expect(result).toContain('fb1');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('uses recent challenges to exclude used question IDs', async () => {
    // recent challenges with used IDs
    mockSelect.mockReturnValueOnce(makeChain([
      { question_ids: '["old1","old2"]' },
      { question_ids: '["old3"]' },
    ]));
    // findQuestion calls
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'new1', difficulty: 'easy' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'new2', difficulty: 'medium' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'new3', difficulty: 'hard' }]));

    const result = await selectChallengeQuestions('6-9', '2026-04-07');

    expect(result).toEqual(['new1', 'new2', 'new3']);
    // The function should have built an exclusion list from the recent challenges
    expect(mockSelect).toHaveBeenCalledTimes(4);
  });

  it('handles malformed question_ids in recent challenges gracefully', async () => {
    // recent challenges with bad JSON
    mockSelect.mockReturnValueOnce(makeChain([
      { question_ids: 'NOT_JSON' },
    ]));
    // findQuestion calls still work
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q1', difficulty: 'easy' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q2', difficulty: 'medium' }]));
    mockSelect.mockReturnValueOnce(makeChain([{ id: 'q3', difficulty: 'hard' }]));

    const result = await selectChallengeQuestions('6-9', '2026-04-07');

    expect(result).toHaveLength(3);
  });
});

describe('submitChallengeAnswer', () => {
  it('inserts an answer record via db.run', async () => {
    mockRun.mockResolvedValueOnce(undefined);

    await submitChallengeAnswer('child-1', '2026-04-07', 'q1', 'A', true);

    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('passes isCorrect=0 for incorrect answers', async () => {
    mockRun.mockResolvedValueOnce(undefined);

    await submitChallengeAnswer('child-1', '2026-04-07', 'q1', 'B', false);

    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});

describe('completeDailyChallenge', () => {
  it('returns allCorrect=true and earnedStar=true when 3/3 correct', async () => {
    // select challenge results
    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 1 },
      { is_correct: 1 },
    ]));
    // select streak (no existing streak)
    mockSelect.mockReturnValueOnce(makeChain([]));
    // mockRun: upsert streak
    mockRun.mockResolvedValueOnce(undefined);

    const result = await completeDailyChallenge('child-1', '2026-04-07');

    expect(result.allCorrect).toBe(true);
    expect(result.earnedStar).toBe(true);
    expect(result.newStreak).toBe(1);
    expect(result.earnedBadge).toBe(false);
  });

  it('returns allCorrect=false when not all correct, still earns star', async () => {
    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 0 },
      { is_correct: 1 },
    ]));
    mockSelect.mockReturnValueOnce(makeChain([]));
    mockRun.mockResolvedValueOnce(undefined);

    const result = await completeDailyChallenge('child-1', '2026-04-07');

    expect(result.allCorrect).toBe(false);
    expect(result.earnedStar).toBe(true);
    expect(result.newStreak).toBe(1);
  });

  it('returns early with no star when < 3 results', async () => {
    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 0 },
    ]));

    const result = await completeDailyChallenge('child-1', '2026-04-07');

    expect(result.earnedStar).toBe(false);
    expect(result.newStreak).toBe(0);
  });

  it('returns earnedStar=false when already completed today', async () => {
    const today = '2026-04-07';

    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 1 },
      { is_correct: 1 },
    ]));
    // existing streak with last_completed_date === today
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 5,
      longest_streak: 10,
      total_stars: 20,
      total_badges: 2,
      last_completed_date: today,
    }]));

    const result = await completeDailyChallenge('child-1', today);

    expect(result.earnedStar).toBe(false);
    expect(result.newStreak).toBe(5);
    expect(result.earnedBadge).toBe(false);
  });

  it('increments streak on consecutive day', async () => {
    // We need yesterday's date — use a fixed date pair
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
    const todayStr = getTodayRiyadh();

    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 1 },
      { is_correct: 1 },
    ]));
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 6,
      longest_streak: 10,
      total_stars: 20,
      total_badges: 0,
      last_completed_date: yesterdayStr,
    }]));
    mockRun.mockResolvedValueOnce(undefined);

    const result = await completeDailyChallenge('child-1', todayStr);

    expect(result.newStreak).toBe(7);
    expect(result.earnedStar).toBe(true);
    // streak=7, 7%7===0 => badge
    expect(result.earnedBadge).toBe(true);
  });

  it('resets streak when there is a gap', async () => {
    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 0 },
      { is_correct: 1 },
    ]));
    // last completed 3 days ago (not yesterday)
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 5,
      longest_streak: 10,
      total_stars: 20,
      total_badges: 1,
      last_completed_date: '2026-04-04', // gap from 2026-04-07
    }]));
    mockRun.mockResolvedValueOnce(undefined);

    const result = await completeDailyChallenge('child-1', '2026-04-07');

    expect(result.newStreak).toBe(1);
    expect(result.earnedBadge).toBe(false);
    expect(result.earnedStar).toBe(true);
  });

  it('awards badge when streak reaches multiple of 7', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];
    const todayStr = getTodayRiyadh();

    mockSelect.mockReturnValueOnce(makeChain([
      { is_correct: 1 },
      { is_correct: 1 },
      { is_correct: 1 },
    ]));
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 13,
      longest_streak: 13,
      total_stars: 30,
      total_badges: 1,
      last_completed_date: yesterdayStr,
    }]));
    mockRun.mockResolvedValueOnce(undefined);

    const result = await completeDailyChallenge('child-1', todayStr);

    expect(result.newStreak).toBe(14);
    expect(result.earnedBadge).toBe(true); // 14 % 7 === 0
  });
});

describe('getStreakInfo', () => {
  it('returns all zeros when no streak record exists', async () => {
    mockSelect.mockReturnValueOnce(makeChain([]));

    const result = await getStreakInfo('child-1');

    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalStars: 0,
      totalBadges: 0,
      completedToday: false,
    });
  });

  it('returns streak values and completedToday=true when last_completed_date is today', async () => {
    const today = getTodayRiyadh();

    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 5,
      longest_streak: 12,
      total_stars: 25,
      total_badges: 3,
      last_completed_date: today,
    }]));

    const result = await getStreakInfo('child-1');

    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(12);
    expect(result.totalStars).toBe(25);
    expect(result.totalBadges).toBe(3);
    expect(result.completedToday).toBe(true);
  });

  it('returns completedToday=false when last_completed_date is not today', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: 3,
      longest_streak: 8,
      total_stars: 15,
      total_badges: 1,
      last_completed_date: '2026-04-01',
    }]));

    const result = await getStreakInfo('child-1');

    expect(result.completedToday).toBe(false);
    expect(result.currentStreak).toBe(3);
  });

  it('handles null/undefined fields gracefully', async () => {
    mockSelect.mockReturnValueOnce(makeChain([{
      current_streak: null,
      longest_streak: undefined,
      total_stars: 0,
      total_badges: null,
      last_completed_date: '2026-04-01',
    }]));

    const result = await getStreakInfo('child-1');

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalStars).toBe(0);
    expect(result.totalBadges).toBe(0);
  });
});
