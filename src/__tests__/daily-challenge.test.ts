import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRun = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/db', () => ({
  getDb: () => ({ select: mockSelect, run: mockRun }),
}));

vi.mock('@/lib/db/schema', () => ({
  questions: {
    id: 'id',
    skillArea: 'skill_area',
    subSkill: 'sub_skill',
    ageGroup: 'age_group',
    difficulty: 'difficulty',
    questionType: 'question_type',
    questionTextAr: 'question_text_ar',
    questionImageUrl: 'question_image_url',
    options: 'options',
    correctOptionIndex: 'correct_option_index',
    explanationAr: 'explanation_ar',
    tags: 'tags',
    isActive: 'is_active',
    createdAt: 'created_at',
  },
}));

const { getTodayRiyadh, completeDailyChallenge, getStreakInfo } = await import('@/lib/daily-challenge');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Creates a mock chain where:
 * - db.select().from().where() resolves to the result array (for queries without .limit())
 * - db.select().from().where().limit() also resolves to the result array
 */
function makeSelectChain(result: unknown[]) {
  // Create an array-like thenable that also has .limit()
  const terminal = Object.assign([...result], {
    limit: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown[]) => void, reject?: (e: unknown) => void) => {
      return Promise.resolve(result).then(resolve, reject);
    },
  });

  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(terminal),
      limit: vi.fn().mockResolvedValue(result),
    }),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getTodayRiyadh', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = getTodayRiyadh();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('completeDailyChallenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns earnedStar=false if fewer than 3 answers', async () => {
    mockSelect.mockReturnValue(makeSelectChain([
      { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q1', is_correct: 1 },
      { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q2', is_correct: 0 },
    ]));

    const result = await completeDailyChallenge('c1', '2026-04-06');
    expect(result.earnedStar).toBe(false);
    expect(result.newStreak).toBe(0);
  });

  it('earns a star when all 3 questions answered (regardless of correctness)', async () => {
    // First select: daily_challenge_results (3 answers)
    mockSelect
      .mockReturnValueOnce(makeSelectChain([
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q1', is_correct: 1 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q2', is_correct: 0 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q3', is_correct: 1 },
      ]))
      // Second select: daily_streaks (no existing streak)
      .mockReturnValueOnce(makeSelectChain([]));

    mockRun.mockResolvedValue(undefined);

    const result = await completeDailyChallenge('c1', '2026-04-06');
    expect(result.earnedStar).toBe(true);
    expect(result.allCorrect).toBe(false);
    expect(result.newStreak).toBe(1);
    expect(result.earnedBadge).toBe(false);
  });

  it('returns allCorrect=true when 3/3 correct', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q1', is_correct: 1 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q2', is_correct: 1 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q3', is_correct: 1 },
      ]))
      .mockReturnValueOnce(makeSelectChain([]));

    mockRun.mockResolvedValue(undefined);

    const result = await completeDailyChallenge('c1', '2026-04-06');
    expect(result.allCorrect).toBe(true);
    expect(result.earnedStar).toBe(true);
  });

  it('does not change streak if already completed today', async () => {
    mockSelect
      .mockReturnValueOnce(makeSelectChain([
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q1', is_correct: 1 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q2', is_correct: 0 },
        { child_id: 'c1', challenge_date: '2026-04-06', question_id: 'q3', is_correct: 1 },
      ]))
      .mockReturnValueOnce(makeSelectChain([{
        child_id: 'c1',
        current_streak: 5,
        longest_streak: 5,
        total_stars: 10,
        total_badges: 1,
        last_completed_date: '2026-04-06',
      }]));

    const result = await completeDailyChallenge('c1', '2026-04-06');
    expect(result.earnedStar).toBe(false);
    expect(result.newStreak).toBe(5);
    expect(result.earnedBadge).toBe(false);
  });

  it('increments streak on consecutive day and earns badge at 7', async () => {
    const today = getTodayRiyadh();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = d.toLocaleString('en-CA', { timeZone: 'Asia/Riyadh' }).split(',')[0];

    mockSelect
      .mockReturnValueOnce(makeSelectChain([
        { child_id: 'c1', challenge_date: today, question_id: 'q1', is_correct: 1 },
        { child_id: 'c1', challenge_date: today, question_id: 'q2', is_correct: 1 },
        { child_id: 'c1', challenge_date: today, question_id: 'q3', is_correct: 1 },
      ]))
      .mockReturnValueOnce(makeSelectChain([{
        child_id: 'c1',
        current_streak: 6,
        longest_streak: 6,
        total_stars: 6,
        total_badges: 0,
        last_completed_date: yesterday,
      }]));

    mockRun.mockResolvedValue(undefined);

    const result = await completeDailyChallenge('c1', today);
    expect(result.newStreak).toBe(7);
    expect(result.earnedBadge).toBe(true);
    expect(result.earnedStar).toBe(true);
  });

  it('resets streak when gap is more than 1 day', async () => {
    const today = getTodayRiyadh();

    mockSelect
      .mockReturnValueOnce(makeSelectChain([
        { child_id: 'c1', challenge_date: today, question_id: 'q1', is_correct: 1 },
        { child_id: 'c1', challenge_date: today, question_id: 'q2', is_correct: 0 },
        { child_id: 'c1', challenge_date: today, question_id: 'q3', is_correct: 0 },
      ]))
      .mockReturnValueOnce(makeSelectChain([{
        child_id: 'c1',
        current_streak: 10,
        longest_streak: 10,
        total_stars: 15,
        total_badges: 1,
        last_completed_date: '2026-03-01',
      }]));

    mockRun.mockResolvedValue(undefined);

    const result = await completeDailyChallenge('c1', today);
    expect(result.newStreak).toBe(1);
    expect(result.earnedStar).toBe(true);
    expect(result.earnedBadge).toBe(false);
  });
});

describe('getStreakInfo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns zeroes for new child', async () => {
    mockSelect.mockReturnValue(makeSelectChain([]));
    const info = await getStreakInfo('new-child');
    expect(info).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalStars: 0,
      totalBadges: 0,
      completedToday: false,
    });
  });

  it('returns correct info with completedToday=true', async () => {
    const today = getTodayRiyadh();
    mockSelect.mockReturnValue(makeSelectChain([{
      child_id: 'c1',
      current_streak: 3,
      longest_streak: 7,
      total_stars: 12,
      total_badges: 1,
      last_completed_date: today,
    }]));

    const info = await getStreakInfo('c1');
    expect(info.currentStreak).toBe(3);
    expect(info.longestStreak).toBe(7);
    expect(info.totalStars).toBe(12);
    expect(info.totalBadges).toBe(1);
    expect(info.completedToday).toBe(true);
  });

  it('returns completedToday=false when last completed long ago', async () => {
    mockSelect.mockReturnValue(makeSelectChain([{
      child_id: 'c1',
      current_streak: 5,
      longest_streak: 5,
      total_stars: 5,
      total_badges: 0,
      last_completed_date: '2026-01-01',
    }]));

    const info = await getStreakInfo('c1');
    expect(info.completedToday).toBe(false);
  });
});
