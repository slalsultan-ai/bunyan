import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, parseSelectedOption } from '@/lib/answer-scoring';

describe('parseSelectedOption', () => {
  it('accepts whole in-range indexes, as numbers or digit strings', () => {
    expect(parseSelectedOption(0)).toBe(0);
    expect(parseSelectedOption(3)).toBe(3);
    expect(parseSelectedOption('2')).toBe(2);
    expect(parseSelectedOption(' 1 ')).toBe(1);
  });

  it('treats anything else as no answer — never as option 0', () => {
    for (const v of ['', ' ', false, true, null, undefined, [], {}, -1, 4, 1.5, NaN, '0x1', '1e0', 'أ']) {
      expect(parseSelectedOption(v)).toBeNull();
    }
  });

  it('respects the option count', () => {
    expect(parseSelectedOption(4, 6)).toBe(4);
    expect(parseSelectedOption(2, 2)).toBeNull();
  });
});

describe('isAnswerCorrect', () => {
  it('is true only when the chosen index equals the saved key', () => {
    expect(isAnswerCorrect(2, 2)).toBe(true);
    expect(isAnswerCorrect(1, 2)).toBe(false);
  });

  it('is false with no answer or no key', () => {
    expect(isAnswerCorrect(null, 0)).toBe(false);
    expect(isAnswerCorrect(0, undefined)).toBe(false);
    expect(isAnswerCorrect(0, null)).toBe(false);
  });
});
