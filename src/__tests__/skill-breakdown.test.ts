import { describe, it, expect } from 'vitest';
import { getSkillBreakdown, updateGuestStateAfterSession, getInitialGuestState } from '@/lib/guest';
import type { GuestState } from '@/types';

// ─── getSkillBreakdown ────────────────────────────────────────────────────────

describe('getSkillBreakdown', () => {
  it('returns all zeros for fresh state', () => {
    const state = getInitialGuestState();
    const bd = getSkillBreakdown(state);
    expect(bd.quantitative).toEqual({ correct: 0, total: 0 });
    expect(bd.verbal).toEqual({ correct: 0, total: 0 });
    expect(bd.logical_patterns).toEqual({ correct: 0, total: 0 });
  });

  it('uses skillStats when available (mixed sessions counted correctly)', () => {
    const state: GuestState = {
      ...getInitialGuestState(),
      skillStats: {
        quantitative: { correct: 6, total: 8 },
        verbal: { correct: 4, total: 5 },
        logical_patterns: { correct: 2, total: 3 },
      },
    };
    const bd = getSkillBreakdown(state);
    expect(bd.quantitative.correct).toBe(6);
    expect(bd.verbal.correct).toBe(4);
    expect(bd.logical_patterns.total).toBe(3);
  });

  it('falls back to session history when skillStats absent (old data)', () => {
    const state: GuestState = {
      ...getInitialGuestState(),
      sessionHistory: [
        { id: 's1', ageGroup: '6-9', skillArea: 'quantitative', score: 7, totalQuestions: 10, pointsEarned: 100, timeTakenMs: 5000, completedAt: new Date().toISOString() },
      ],
    };
    const bd = getSkillBreakdown(state);
    expect(bd.quantitative).toEqual({ correct: 7, total: 10 });
    expect(bd.verbal).toEqual({ correct: 0, total: 0 });
  });

  it('old data: mixed sessions produce zero bars (expected fallback behavior)', () => {
    const state: GuestState = {
      ...getInitialGuestState(),
      sessionHistory: [
        { id: 's1', ageGroup: '6-9', skillArea: 'mixed', score: 8, totalQuestions: 10, pointsEarned: 100, timeTakenMs: 5000, completedAt: new Date().toISOString() },
      ],
    };
    const bd = getSkillBreakdown(state);
    // Old behavior: mixed not counted → zeros. skillStats will fix this going forward.
    expect(bd.quantitative.total).toBe(0);
  });
});

// ─── updateGuestStateAfterSession — skillStats accumulation ──────────────────

describe('updateGuestStateAfterSession skillStats', () => {
  function makeResult(skillArea: string, answers: Array<{ skillArea: string; isCorrect: boolean }>) {
    return {
      sessionId: crypto.randomUUID(),
      ageGroup: '6-9' as const,
      skillArea: skillArea as never,
      score: answers.filter(a => a.isCorrect).length,
      totalQuestions: answers.length,
      timeTakenMs: 3000,
      answers: answers.map((a, i) => ({ questionId: `q${i}`, skillArea: a.skillArea, isCorrect: a.isCorrect })),
    };
  }

  it('populates skillStats from first mixed session', () => {
    const state = getInitialGuestState();
    const result = makeResult('mixed', [
      { skillArea: 'quantitative', isCorrect: true },
      { skillArea: 'quantitative', isCorrect: false },
      { skillArea: 'verbal', isCorrect: true },
      { skillArea: 'logical_patterns', isCorrect: true },
    ]);
    const { newState } = updateGuestStateAfterSession(state, result);
    expect(newState.skillStats?.quantitative).toEqual({ correct: 1, total: 2 });
    expect(newState.skillStats?.verbal).toEqual({ correct: 1, total: 1 });
    expect(newState.skillStats?.logical_patterns).toEqual({ correct: 1, total: 1 });
  });

  it('accumulates skillStats across multiple sessions', () => {
    let state = getInitialGuestState();

    const r1 = makeResult('mixed', [
      { skillArea: 'quantitative', isCorrect: true },
      { skillArea: 'verbal', isCorrect: false },
    ]);
    state = updateGuestStateAfterSession(state, r1).newState;

    const r2 = makeResult('quantitative', [
      { skillArea: 'quantitative', isCorrect: true },
      { skillArea: 'quantitative', isCorrect: true },
    ]);
    state = updateGuestStateAfterSession(state, r2).newState;

    expect(state.skillStats?.quantitative).toEqual({ correct: 3, total: 3 });
    expect(state.skillStats?.verbal).toEqual({ correct: 0, total: 1 });
  });

  it('getSkillBreakdown reflects accurate per-answer data after mixed session', () => {
    const state = getInitialGuestState();
    const result = makeResult('mixed', [
      { skillArea: 'quantitative', isCorrect: true },
      { skillArea: 'quantitative', isCorrect: true },
      { skillArea: 'verbal', isCorrect: false },
      { skillArea: 'logical_patterns', isCorrect: true },
    ]);
    const { newState } = updateGuestStateAfterSession(state, result);
    const bd = getSkillBreakdown(newState);

    // Bars should now show real data, not zeros
    expect(bd.quantitative.total).toBe(2);
    expect(bd.quantitative.correct).toBe(2);
    expect(bd.verbal.total).toBe(1);
    expect(bd.verbal.correct).toBe(0);
    expect(bd.logical_patterns.total).toBe(1);
    expect(bd.logical_patterns.correct).toBe(1);
  });

  it('ignores unknown skill areas gracefully', () => {
    const state = getInitialGuestState();
    const result = makeResult('mixed', [
      { skillArea: 'unknown_skill', isCorrect: true },
      { skillArea: 'quantitative', isCorrect: true },
    ]);
    expect(() => updateGuestStateAfterSession(state, result)).not.toThrow();
    const { newState } = updateGuestStateAfterSession(state, result);
    expect(newState.skillStats?.quantitative.total).toBe(1);
  });
});
