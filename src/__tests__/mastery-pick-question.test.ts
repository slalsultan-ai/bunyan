import { describe, it, expect } from 'vitest';
import { pickQuestion, questionContentKey, questionTextKey, type PoolQuestion } from '@/lib/mastery/service';

/** Question whose text key defaults to its id (distinct texts). */
const q = (id: string, difficulty = 'medium', text = id): PoolQuestion => ({
  id, skillKey: 's', difficulty, optionCount: 4, textKey: questionTextKey(text),
});
const base = {
  sessionSeen: new Set<string>(),
  everSeen: new Set<string>(),
  recentSeen: new Set<string>(),
  testSeen: new Set<string>(),
};

describe('questionContentKey', () => {
  it('treats a shared stem with different options as different questions', () => {
    const stem = 'أي كلمة مختلفة عن البقية؟';
    expect(questionContentKey(stem, [{ text: 'تفاح' }, { text: 'موز' }])).not.toBe(questionContentKey(stem, [{ text: 'قلم' }, { text: 'كتاب' }]));
  });

  it('treats the same text and options (in any order) as one question', () => {
    expect(questionContentKey('كم  تفاحة؟', [{ text: '2' }, { text: '3' }])).toBe(questionContentKey('كم تفاحة؟', [{ text: '3' }, { text: '2' }]));
  });
});

describe('questionTextKey', () => {
  it('ignores spacing and tatweel differences', () => {
    expect(questionTextKey('  كم  تفاحة\nلديه؟ ')).toBe(questionTextKey('كم تفاحة لديه؟'));
    expect(questionTextKey('كـــم تفاحة')).toBe(questionTextKey('كم تفاحة'));
    expect(questionTextKey(null)).toBe('');
  });
});

describe('pickQuestion', () => {
  it('parallel test uses only never-seen questions when available', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickQuestion({
        ...base, candidates: [q('a'), q('b'), q('c')], purpose: 'test', difficulty: 'medium',
        everSeen: new Set(['a', 'b']),
      })!;
      expect(r.question.id).toBe('c');
      expect(r.note).toBe('unseen');
    }
  });

  it('parallel test treats a duplicate copy of a seen question as seen', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickQuestion({
        ...base,
        candidates: [q('copy-1', 'medium', 'ما جمع كلمة "كتاب"؟'), q('fresh', 'medium', 'ما جمع كلمة "قلم"؟')],
        purpose: 'test', difficulty: 'medium',
        everSeen: new Set([questionTextKey('ما جمع  كلمة "كتاب"؟')]),
      })!;
      expect(r.question.id).toBe('fresh');
      expect(r.note).toBe('unseen');
    }
  });

  it('parallel test never serves two copies of the same question', () => {
    const r = pickQuestion({
      ...base,
      candidates: [q('copy-1', 'medium', 'نفس السؤال'), q('copy-2', 'medium', 'نفس السؤال')],
      purpose: 'test', difficulty: 'medium',
      testSeen: new Set([questionTextKey('نفس السؤال')]),
    });
    expect(r).toBeNull();
  });

  it('parallel test falls back to not-recent when every text was seen', () => {
    const r = pickQuestion({
      ...base, candidates: [q('a'), q('b')], purpose: 'test', difficulty: 'medium',
      everSeen: new Set(['a', 'b']), recentSeen: new Set(['a']),
    })!;
    expect(r.question.id).toBe('b');
    expect(r.note).toBe('fallback_not_recent');
  });

  it('practice prefers the target difficulty, then the nearest one', () => {
    const r = pickQuestion({ ...base, candidates: [q('e', 'easy'), q('h', 'hard')], purpose: 'practice', difficulty: 'easy' })!;
    expect(r.question.id).toBe('e');
    const f = pickQuestion({ ...base, candidates: [q('m', 'medium'), q('h', 'hard')], purpose: 'practice', difficulty: 'easy' })!;
    expect(f.question.id).toBe('m');
    expect(f.note).toBe('difficulty_fallback:medium');
  });

  it('never repeats a question (or a copy of it) within the session', () => {
    expect(pickQuestion({
      ...base, candidates: [q('a'), q('a2', 'medium', 'a')], purpose: 'practice', difficulty: 'medium',
      sessionSeen: new Set(['a']),
    })).toBeNull();
  });

  it('avoids recently seen questions in practice when possible', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickQuestion({
        ...base, candidates: [q('a'), q('b')], purpose: 'practice', difficulty: 'medium', recentSeen: new Set(['a']),
      })!;
      expect(r.question.id).toBe('b');
    }
  });
});
