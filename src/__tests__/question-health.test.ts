import { describe, it, expect } from 'vitest';
import { classifyQuestionHealth, healthSortKey, summarizeHealth, MIN_ATTEMPTS_FOR_VERDICT } from '@/lib/question-health';

const q = (totalAttempts: number, correctCount: number, optionDist: number[], correctOptionIndex: number) =>
  classifyQuestionHealth({ totalAttempts, correctCount, optionDist, correctOptionIndex });

describe('classifyQuestionHealth', () => {
  it('gives no verdict below the minimum sample (3/3 wrong is not critical)', () => {
    const v = q(3, 0, [2, 1, 0, 0], 2);
    expect(v.passRate).toBe(0);
    expect(v.status).toBe('low_sample');
  });

  it('classifies judged questions by pass rate', () => {
    expect(q(10, 2, [2, 3, 3, 2], 0).status).toBe('critical');
    expect(q(10, 4, [4, 2, 2, 2], 0).status).toBe('warning');
    expect(q(10, 5, [5, 2, 2, 1], 0).status).toBe('healthy');
    expect(MIN_ATTEMPTS_FOR_VERDICT).toBe(10);
  });

  it('flags a suspected key error when most pick the same wrong option', () => {
    // "2 × 5 = ؟": 13 of 18 chose option 1 while key is 2
    const v = q(18, 4, [1, 13, 4, 0], 2);
    expect(v.suspectedKey).toEqual({ index: 1, share: 0.72 });
  });

  it('does not flag spread-out wrong answers or tiny samples', () => {
    expect(q(12, 2, [3, 4, 2, 3], 2).suspectedKey).toBeNull();
    expect(q(4, 0, [0, 4, 0, 0], 2).suspectedKey).toBeNull();
  });

  it('does not flag when the correct option is still the most chosen', () => {
    expect(q(10, 5, [0, 5, 5, 0], 2).suspectedKey).toBeNull();
  });
});

describe('summary and ordering', () => {
  it('counts statuses and averages only judged questions', () => {
    const vs = [q(3, 0, [3, 0, 0, 0], 1), q(10, 2, [2, 6, 1, 1], 0), q(20, 18, [18, 1, 1, 0], 0)];
    const s = summarizeHealth(vs);
    expect(s).toMatchObject({ critical: 1, healthy: 1, lowSample: 1, suspectedKey: 1, total: 3, avgPassRate: 55 });
  });

  it('puts suspected key errors first and low samples last', () => {
    const suspect = q(10, 1, [1, 8, 1, 0], 0);
    const critical = q(10, 2, [2, 3, 3, 2], 0);
    const low = q(3, 0, [0, 1, 1, 1], 0);
    const sorted = [low, critical, suspect].sort((a, b) => {
      const [ga, va] = healthSortKey(a); const [gb, vb] = healthSortKey(b);
      return ga - gb || va - vb;
    });
    expect(sorted).toEqual([suspect, critical, low]);
  });
});
