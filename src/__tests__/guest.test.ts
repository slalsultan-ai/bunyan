import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/gamification/levels', () => ({
  getLevelForPoints: vi.fn((pts: number) => ({ level: pts >= 200 ? 2 : 1, name: 'test', pointsRequired: 0 })),
}));

vi.mock('@/lib/gamification/streaks', () => ({
  calculateStreak: vi.fn(() => ({ newStreak: 1, isFirstSessionToday: true })),
}));

vi.mock('@/lib/gamification/points', () => ({
  calculateSessionPoints: vi.fn(() => 50),
}));

vi.mock('@/lib/gamification/badges', () => ({
  checkNewBadges: vi.fn(() => []),
}));

vi.mock('@/lib/utils', () => ({
  generateGuestId: () => 'test-uuid-1234',
  getTodayDateString: () => '2026-04-07',
}));

const {
  getInitialGuestState,
  updateGuestStateAfterSession,
  getSkillBreakdown,
  getWeakestSkill,
} = await import('@/lib/guest');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sessionResult = {
  sessionId: 's1',
  ageGroup: '6-9' as const,
  skillArea: 'quantitative' as const,
  score: 7,
  totalQuestions: 10,
  timeTakenMs: 60000,
  answers: [
    { questionId: 'q1', skillArea: 'quantitative', isCorrect: true },
    { questionId: 'q2', skillArea: 'quantitative', isCorrect: false },
  ],
};

// ─── getInitialGuestState ───────────────────────────────────────────────────

describe('getInitialGuestState', () => {
  it('returns default state with guestId and zeroed values', () => {
    const state = getInitialGuestState();
    expect(state.guestId).toBe('test-uuid-1234');
    expect(state.totalPoints).toBe(0);
    expect(state.currentLevel).toBe(1);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(0);
    expect(state.badges).toEqual([]);
    expect(state.totalSessions).toBe(0);
    expect(state.totalCorrect).toBe(0);
    expect(state.totalAnswered).toBe(0);
    expect(state.lastPracticeDate).toBeNull();
    expect(state.sessionHistory).toEqual([]);
  });
});

// ─── updateGuestStateAfterSession ───────────────────────────────────────────

describe('updateGuestStateAfterSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increments totalSessions, totalCorrect, and totalAnswered', () => {
    const state = getInitialGuestState();
    const { newState } = updateGuestStateAfterSession(state, sessionResult);
    expect(newState.totalSessions).toBe(1);
    expect(newState.totalCorrect).toBe(7);
    expect(newState.totalAnswered).toBe(10);
  });

  it('updates skillStats per answer', () => {
    const state = getInitialGuestState();
    const { newState } = updateGuestStateAfterSession(state, sessionResult);
    expect(newState.skillStats).toBeDefined();
    expect(newState.skillStats!.quantitative.total).toBe(2);
    expect(newState.skillStats!.quantitative.correct).toBe(1);
  });

  it('appends to sessionHistory with max 50 entries', () => {
    const state = {
      ...getInitialGuestState(),
      sessionHistory: Array.from({ length: 50 }, (_, i) => ({
        id: `old-${i}`,
        ageGroup: '6-9' as const,
        skillArea: 'quantitative' as const,
        score: 5,
        totalQuestions: 10,
        pointsEarned: 30,
        timeTakenMs: 50000,
        completedAt: '2026-04-01T00:00:00Z',
      })),
    };
    const { newState } = updateGuestStateAfterSession(state, sessionResult);
    expect(newState.sessionHistory.length).toBe(50);
    expect(newState.sessionHistory[0].id).toBe('s1');
  });

  it('returns pointsEarned and newBadges', () => {
    const state = getInitialGuestState();
    const { pointsEarned, newBadges } = updateGuestStateAfterSession(state, sessionResult);
    expect(pointsEarned).toBe(50);
    expect(newBadges).toEqual([]);
  });

  it('updates lastPracticeDate to today', () => {
    const state = getInitialGuestState();
    const { newState } = updateGuestStateAfterSession(state, sessionResult);
    expect(newState.lastPracticeDate).toBe('2026-04-07');
  });

  it('updates longestStreak when newStreak exceeds it', () => {
    const state = { ...getInitialGuestState(), longestStreak: 0 };
    const { newState } = updateGuestStateAfterSession(state, sessionResult);
    expect(newState.currentStreak).toBe(1);
    expect(newState.longestStreak).toBe(1);
  });

  it('accumulates skillStats across multiple sessions', () => {
    const state = getInitialGuestState();
    const { newState: state1 } = updateGuestStateAfterSession(state, sessionResult);

    const verbalResult = {
      ...sessionResult,
      sessionId: 's2',
      skillArea: 'verbal' as const,
      answers: [
        { questionId: 'q3', skillArea: 'verbal', isCorrect: true },
        { questionId: 'q4', skillArea: 'verbal', isCorrect: true },
      ],
    };
    const { newState: state2 } = updateGuestStateAfterSession(state1, verbalResult);
    expect(state2.skillStats!.quantitative.total).toBe(2);
    expect(state2.skillStats!.verbal.total).toBe(2);
    expect(state2.skillStats!.verbal.correct).toBe(2);
  });

  it('handles mixed skill sessions correctly', () => {
    const state = getInitialGuestState();
    const mixedResult = {
      ...sessionResult,
      skillArea: 'mixed' as const,
      answers: [
        { questionId: 'q1', skillArea: 'quantitative', isCorrect: true },
        { questionId: 'q2', skillArea: 'verbal', isCorrect: false },
        { questionId: 'q3', skillArea: 'logical_patterns', isCorrect: true },
      ],
    };
    const { newState } = updateGuestStateAfterSession(state, mixedResult);
    expect(newState.skillStats!.quantitative.correct).toBe(1);
    expect(newState.skillStats!.verbal.correct).toBe(0);
    expect(newState.skillStats!.logical_patterns.correct).toBe(1);
  });
});

// ─── getSkillBreakdown ──────────────────────────────────────────────────────

describe('getSkillBreakdown', () => {
  it('returns skillStats when present', () => {
    const state = {
      ...getInitialGuestState(),
      skillStats: {
        quantitative: { correct: 10, total: 15 },
        verbal: { correct: 5, total: 8 },
        logical_patterns: { correct: 3, total: 4 },
      },
    };
    const breakdown = getSkillBreakdown(state);
    expect(breakdown.quantitative).toEqual({ correct: 10, total: 15 });
    expect(breakdown.verbal).toEqual({ correct: 5, total: 8 });
  });

  it('calculates from sessionHistory when skillStats is absent (legacy)', () => {
    const state = {
      ...getInitialGuestState(),
      sessionHistory: [
        { id: 's1', ageGroup: '6-9' as const, skillArea: 'quantitative' as const, score: 7, totalQuestions: 10, pointsEarned: 50, timeTakenMs: 60000, completedAt: '2026-04-07T00:00:00Z' },
        { id: 's2', ageGroup: '6-9' as const, skillArea: 'verbal' as const, score: 5, totalQuestions: 10, pointsEarned: 40, timeTakenMs: 55000, completedAt: '2026-04-07T01:00:00Z' },
      ],
    };
    const breakdown = getSkillBreakdown(state);
    expect(breakdown.quantitative).toEqual({ correct: 7, total: 10 });
    expect(breakdown.verbal).toEqual({ correct: 5, total: 10 });
    expect(breakdown.logical_patterns).toEqual({ correct: 0, total: 0 });
  });

  it('returns all zeros when no data', () => {
    const state = getInitialGuestState();
    const breakdown = getSkillBreakdown(state);
    expect(breakdown.quantitative).toEqual({ correct: 0, total: 0 });
  });
});

// ─── getWeakestSkill ────────────────────────────────────────────────────────

describe('getWeakestSkill', () => {
  it('returns the weakest skill when data exists', () => {
    const state = {
      ...getInitialGuestState(),
      skillStats: {
        quantitative: { correct: 8, total: 10 },
        verbal: { correct: 3, total: 10 },
        logical_patterns: { correct: 6, total: 10 },
      },
    };
    expect(getWeakestSkill(state)).toBe('verbal');
  });

  it('returns null when all skills have zero total', () => {
    const state = getInitialGuestState();
    expect(getWeakestSkill(state)).toBeNull();
  });

  it('returns the only skill with data', () => {
    const state = {
      ...getInitialGuestState(),
      skillStats: {
        quantitative: { correct: 5, total: 10 },
        verbal: { correct: 0, total: 0 },
        logical_patterns: { correct: 0, total: 0 },
      },
    };
    expect(getWeakestSkill(state)).toBe('quantitative');
  });
});
