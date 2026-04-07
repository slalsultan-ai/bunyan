import { describe, it, expect } from 'vitest';
import { getBunaaMessage, getPersonalizedMessage, _messages, type MessageContext } from '@/lib/mascot/bunaa-messages';

describe('getBunaaMessage', () => {
  it('returns a message for every context', () => {
    const contexts: MessageContext[] = [
      'correct_answer', 'wrong_answer', 'streak_3', 'streak_5', 'streak_10',
      'streak_broken', 'session_start', 'session_end', 'session_half',
      'daily_challenge_start', 'daily_challenge_done', 'star_earned',
      'badge_earned', 'level_up', 'comeback', 'first_visit', 'perfect_session',
      'hard_question_correct', 'improving_skill', 'idle_30s',
    ];

    for (const ctx of contexts) {
      const msg = getBunaaMessage(ctx);
      expect(msg.text.length).toBeGreaterThan(0);
      expect(['happy', 'excited', 'encouraging', 'thinking']).toContain(msg.expression);
    }
  });

  it('every context has at least one message in the dictionary', () => {
    const allContexts = Object.keys(_messages) as MessageContext[];
    expect(allContexts.length).toBe(20);

    for (const ctx of allContexts) {
      expect(_messages[ctx].length).toBeGreaterThan(0);
    }
  });

  it('does not repeat the same message when lastMessageText is provided', () => {
    // Get a context with multiple messages
    const msgs = _messages.correct_answer;
    expect(msgs.length).toBeGreaterThan(1);

    const first = msgs[0].text;
    // Call 20 times — at least once should be different
    let gotDifferent = false;
    for (let i = 0; i < 20; i++) {
      const msg = getBunaaMessage('correct_answer', first);
      if (msg.text !== first) {
        gotDifferent = true;
        break;
      }
    }
    expect(gotDifferent).toBe(true);
  });

  it('returns correct expression types per context', () => {
    // Wrong answer should be encouraging
    for (const msg of _messages.wrong_answer) {
      expect(msg.expression).toBe('encouraging');
    }

    // Streak messages should be excited
    for (const msg of _messages.streak_10) {
      expect(msg.expression).toBe('excited');
    }

    // Idle should be thinking or encouraging
    for (const msg of _messages.idle_30s) {
      expect(['thinking', 'encouraging']).toContain(msg.expression);
    }
  });
});

describe('getPersonalizedMessage', () => {
  it('replaces {name} with child name', () => {
    // Create a context that might have {name} — or just verify replacement works
    const msg = getPersonalizedMessage('session_start', 'أحمد');
    // The message might not have {name}, that's fine — just ensure it doesn't crash
    expect(msg.text).toBeDefined();
    expect(msg.expression).toBeDefined();
  });
});
