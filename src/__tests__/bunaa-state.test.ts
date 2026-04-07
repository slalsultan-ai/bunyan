import { describe, it, expect } from 'vitest';
import {
  shouldShowBunaa,
  updateBunaaState,
  createInitialState,
  getAnswerEvent,
  type BunaaState,
} from '@/lib/mascot/bunaa-state';

function makeState(overrides: Partial<BunaaState> = {}): BunaaState {
  return { ...createInitialState(), ...overrides };
}

describe('shouldShowBunaa', () => {
  it('returns true for important events with fresh state', () => {
    const state = makeState();
    expect(shouldShowBunaa(state, 'session_start')).toBe(true);
    expect(shouldShowBunaa(state, 'session_end')).toBe(true);
    expect(shouldShowBunaa(state, 'wrong_answer')).toBe(true);
    expect(shouldShowBunaa(state, 'streak_3')).toBe(true);
    expect(shouldShowBunaa(state, 'streak_5')).toBe(true);
    expect(shouldShowBunaa(state, 'streak_10')).toBe(true);
    expect(shouldShowBunaa(state, 'badge_earned')).toBe(true);
    expect(shouldShowBunaa(state, 'level_up')).toBe(true);
    expect(shouldShowBunaa(state, 'first_visit')).toBe(true);
    expect(shouldShowBunaa(state, 'daily_challenge_start')).toBe(true);
    expect(shouldShowBunaa(state, 'daily_challenge_done')).toBe(true);
    expect(shouldShowBunaa(state, 'comeback')).toBe(true);
    expect(shouldShowBunaa(state, 'idle_30s')).toBe(true);
  });

  it('returns false after 15 messages (max per session)', () => {
    const state = makeState({ messagesShownCount: 15 });
    expect(shouldShowBunaa(state, 'session_start')).toBe(false);
    expect(shouldShowBunaa(state, 'wrong_answer')).toBe(false);
    expect(shouldShowBunaa(state, 'badge_earned')).toBe(false);
  });

  it('respects cooldown for non-important events', () => {
    const state = makeState({ lastMessageTime: Date.now() - 5000 }); // 5s ago
    expect(shouldShowBunaa(state, 'wrong_answer')).toBe(false);
    expect(shouldShowBunaa(state, 'correct_answer')).toBe(false);
  });

  it('important events bypass cooldown', () => {
    const state = makeState({ lastMessageTime: Date.now() - 5000 }); // 5s ago
    expect(shouldShowBunaa(state, 'badge_earned')).toBe(true);
    expect(shouldShowBunaa(state, 'level_up')).toBe(true);
    expect(shouldShowBunaa(state, 'streak_10')).toBe(true);
    expect(shouldShowBunaa(state, 'first_visit')).toBe(true);
  });

  it('correct_answer shows ~40% of the time (medium frequency)', () => {
    const state = makeState();
    let shown = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      if (shouldShowBunaa(state, 'correct_answer', 'medium')) shown++;
    }
    // Should be roughly 40% — accept 25-55% range
    const rate = shown / trials;
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.55);
  });

  it('correct_answer always shows in high frequency mode', () => {
    const state = makeState();
    expect(shouldShowBunaa(state, 'correct_answer', 'high')).toBe(true);
  });

  it('low frequency only shows important events', () => {
    const state = makeState();
    expect(shouldShowBunaa(state, 'session_start', 'low')).toBe(true);
    expect(shouldShowBunaa(state, 'badge_earned', 'low')).toBe(true);
    expect(shouldShowBunaa(state, 'wrong_answer', 'low')).toBe(false);
    expect(shouldShowBunaa(state, 'streak_3', 'low')).toBe(false);
  });

  it('improving_skill shows only once per session', () => {
    const state = makeState({ hasSeenImproving: false });
    expect(shouldShowBunaa(state, 'improving_skill')).toBe(true);

    const state2 = makeState({ hasSeenImproving: true });
    expect(shouldShowBunaa(state2, 'improving_skill')).toBe(false);
  });
});

describe('updateBunaaState', () => {
  it('increments streak on correct answer', () => {
    const state = makeState({ currentStreak: 2 });
    const next = updateBunaaState(state, 'correct_answer', { isCorrect: true, messageText: 'test' });
    expect(next.currentStreak).toBe(3);
    expect(next.correctAnswers).toBe(1);
    expect(next.questionsAnswered).toBe(1);
  });

  it('resets streak on wrong answer', () => {
    const state = makeState({ currentStreak: 5 });
    const next = updateBunaaState(state, 'wrong_answer', { isCorrect: false, messageText: 'test' });
    expect(next.currentStreak).toBe(0);
    expect(next.questionsAnswered).toBe(1);
  });

  it('increments message count when messageText provided', () => {
    const state = makeState({ messagesShownCount: 3 });
    const next = updateBunaaState(state, 'session_start', { messageText: 'hello' });
    expect(next.messagesShownCount).toBe(4);
    expect(next.lastMessageText).toBe('hello');
  });

  it('marks first visit as seen', () => {
    const state = makeState();
    expect(state.hasSeenFirstVisit).toBe(false);
    const next = updateBunaaState(state, 'first_visit', { messageText: 'hi' });
    expect(next.hasSeenFirstVisit).toBe(true);
  });

  it('marks improving as seen', () => {
    const state = makeState();
    const next = updateBunaaState(state, 'improving_skill', { messageText: 'nice' });
    expect(next.hasSeenImproving).toBe(true);
  });
});

describe('getAnswerEvent', () => {
  it('returns streak_10 at streak 9 + correct', () => {
    expect(getAnswerEvent(true, 9)).toBe('streak_10');
  });

  it('returns streak_5 at streak 4 + correct', () => {
    expect(getAnswerEvent(true, 4)).toBe('streak_5');
  });

  it('returns streak_3 at streak 2 + correct', () => {
    expect(getAnswerEvent(true, 2)).toBe('streak_3');
  });

  it('returns hard_question_correct for hard difficulty', () => {
    expect(getAnswerEvent(true, 0, 'hard')).toBe('hard_question_correct');
  });

  it('returns correct_answer for normal correct', () => {
    expect(getAnswerEvent(true, 0)).toBe('correct_answer');
    expect(getAnswerEvent(true, 1)).toBe('correct_answer');
  });

  it('returns streak_broken when streak >= 3 and wrong', () => {
    expect(getAnswerEvent(false, 3)).toBe('streak_broken');
    expect(getAnswerEvent(false, 10)).toBe('streak_broken');
  });

  it('returns wrong_answer when streak < 3 and wrong', () => {
    expect(getAnswerEvent(false, 0)).toBe('wrong_answer');
    expect(getAnswerEvent(false, 2)).toBe('wrong_answer');
  });
});
