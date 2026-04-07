import { describe, it, expect } from 'vitest';
import { getLevelForPoints, getNextLevel, getLevelProgress } from '@/lib/gamification/levels';
import { calculateStreak } from '@/lib/gamification/streaks';
import { getBadgeById, checkNewBadges } from '@/lib/gamification/badges';
import { getTodayDateString } from '@/lib/utils';
import type { GuestState } from '@/types';

// ─── Levels ─────────────────────────────────────────────────────────────────

describe('getLevelForPoints', () => {
  it('returns level 1 for 0 points', () => {
    expect(getLevelForPoints(0).level).toBe(1);
  });

  it('returns level 1 for 199 points', () => {
    expect(getLevelForPoints(199).level).toBe(1);
  });

  it('returns level 2 for 200 points', () => {
    expect(getLevelForPoints(200).level).toBe(2);
  });

  it('returns level 3 for 500 points', () => {
    expect(getLevelForPoints(500).level).toBe(3);
  });

  it('returns level 4 for 1000 points', () => {
    expect(getLevelForPoints(1000).level).toBe(4);
  });

  it('returns level 5 for 2000 points', () => {
    expect(getLevelForPoints(2000).level).toBe(5);
  });

  it('returns level 6 for 4000 points', () => {
    expect(getLevelForPoints(4000).level).toBe(6);
  });

  it('returns level 7 for 7000 points', () => {
    expect(getLevelForPoints(7000).level).toBe(7);
  });

  it('returns level 7 for 10000 points', () => {
    expect(getLevelForPoints(10000).level).toBe(7);
  });
});

describe('getNextLevel', () => {
  it('returns level 2 for current level 1', () => {
    const next = getNextLevel(1);
    expect(next).not.toBeNull();
    expect(next!.level).toBe(2);
  });

  it('returns level 7 for current level 6', () => {
    const next = getNextLevel(6);
    expect(next).not.toBeNull();
    expect(next!.level).toBe(7);
  });

  it('returns null for current level 7', () => {
    expect(getNextLevel(7)).toBeNull();
  });
});

describe('getLevelProgress', () => {
  it('returns 0% for 0 points', () => {
    expect(getLevelProgress(0)).toBe(0);
  });

  it('returns 50% for 100 points (halfway through level 1 range 0-200)', () => {
    expect(getLevelProgress(100)).toBe(50);
  });

  it('returns 100% for max level (7000 points)', () => {
    expect(getLevelProgress(7000)).toBe(100);
  });

  it('returns 100% for points beyond max level', () => {
    expect(getLevelProgress(10000)).toBe(100);
  });
});

// ─── Streaks ────────────────────────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns streak 1 and isFirstSessionToday for null lastDate', () => {
    const result = calculateStreak(null, 0);
    expect(result).toEqual({ newStreak: 1, isFirstSessionToday: true });
  });

  it('keeps same streak and isFirstSessionToday=false when lastDate is today', () => {
    const today = getTodayDateString();
    const result = calculateStreak(today, 5);
    expect(result).toEqual({ newStreak: 5, isFirstSessionToday: false });
  });

  it('increments streak when lastDate was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const result = calculateStreak(yesterdayStr, 3);
    expect(result).toEqual({ newStreak: 4, isFirstSessionToday: true });
  });

  it('resets streak to 1 when lastDate was 3 days ago', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const str = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`;
    const result = calculateStreak(str, 10);
    expect(result).toEqual({ newStreak: 1, isFirstSessionToday: true });
  });
});

// ─── Badges ─────────────────────────────────────────────────────────────────

describe('getBadgeById', () => {
  it('returns badge object for known id', () => {
    const badge = getBadgeById('starter');
    expect(badge).toBeDefined();
    expect(badge!.id).toBe('starter');
    expect(badge!.name).toBe('نجمة البداية');
  });

  it('returns undefined for nonexistent id', () => {
    expect(getBadgeById('nonexistent')).toBeUndefined();
  });
});

describe('checkNewBadges', () => {
  const baseState: GuestState = {
    guestId: 'g1',
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    badges: [] as string[],
    totalSessions: 1,
    totalCorrect: 0,
    totalAnswered: 0,
    lastPracticeDate: null,
    sessionHistory: [],
  };

  const baseResult = {
    score: 0,
    totalQuestions: 10,
    skillArea: 'mixed',
    quantitativeTotal: 0,
    verbalTotal: 0,
    logicalTotal: 0,
  };

  it('awards starter badge when totalSessions >= 1', () => {
    const badges = checkNewBadges(baseState, baseResult);
    expect(badges).toContain('starter');
  });

  it('awards achiever badge for perfect 10/10 score', () => {
    const badges = checkNewBadges(baseState, { ...baseResult, score: 10, totalQuestions: 10 });
    expect(badges).toContain('achiever');
  });

  it('does not award achiever for 10/10 when totalQuestions is not 10', () => {
    const badges = checkNewBadges(baseState, { ...baseResult, score: 10, totalQuestions: 15 });
    expect(badges).not.toContain('achiever');
  });

  it('awards persistent badge when currentStreak >= 7', () => {
    const state = { ...baseState, currentStreak: 7 };
    const badges = checkNewBadges(state, baseResult);
    expect(badges).toContain('persistent');
  });

  it('awards math_genius when quantitativeTotal >= 50', () => {
    const badges = checkNewBadges(baseState, { ...baseResult, quantitativeTotal: 50 });
    expect(badges).toContain('math_genius');
  });

  it('awards word_king when verbalTotal >= 50', () => {
    const badges = checkNewBadges(baseState, { ...baseResult, verbalTotal: 50 });
    expect(badges).toContain('word_king');
  });

  it('awards detective when logicalTotal >= 50', () => {
    const badges = checkNewBadges(baseState, { ...baseResult, logicalTotal: 50 });
    expect(badges).toContain('detective');
  });

  it('awards champion when all 6 prerequisite badges are earned', () => {
    const state: GuestState = {
      ...baseState,
      currentStreak: 7,
      badges: ['starter', 'achiever', 'persistent', 'math_genius', 'word_king'],
    };
    const badges = checkNewBadges(state, { ...baseResult, logicalTotal: 50 });
    expect(badges).toContain('detective');
    expect(badges).toContain('champion');
  });

  it('does not duplicate already-earned badges', () => {
    const state: GuestState = { ...baseState, badges: ['starter'] };
    const badges = checkNewBadges(state, baseResult);
    expect(badges).not.toContain('starter');
  });
});
