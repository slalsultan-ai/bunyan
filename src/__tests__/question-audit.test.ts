import { describe, it, expect, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/db', () => ({ getDb: () => ({}) }));
const { diffQuestion } = await import('@/lib/question-audit');

describe('diffQuestion', () => {
  it('reports an answer-key change with before and after', () => {
    const changes = diffQuestion(
      { correctOptionIndex: 0, questionTextAr: 'أ', options: [{ text: '1' }] },
      { correctOptionIndex: 1, questionTextAr: 'أ', options: [{ text: '1' }] },
    );
    expect(changes).toEqual({ correctOptionIndex: { from: 0, to: 1 } });
  });

  it('compares options and explanations by value', () => {
    const changes = diffQuestion(
      { options: [{ text: 'لا' }], explanationAr: 'x' },
      { options: [{ text: 'مستحيل' }], explanationAr: 'x' },
    );
    expect(Object.keys(changes)).toEqual(['options']);
  });

  it('returns nothing when nothing changed', () => {
    expect(diffQuestion({ isActive: true, difficulty: 'easy' }, { isActive: true, difficulty: 'easy' })).toEqual({});
  });
});
