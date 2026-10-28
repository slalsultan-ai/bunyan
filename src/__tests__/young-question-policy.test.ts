import { describe, expect, it } from 'vitest';
import { getYoungQuestionViolation, isYoungQuestionSafe } from '@/lib/young-question-policy';

const audioQuestion = {
  ageGroup: '4-5',
  questionType: 'audio',
  options: [{ text: '🐟' }, { text: '🐈' }, { text: '🐔' }, { text: '🐑' }],
};

describe('young question policy', () => {
  it('allows spoken questions with visual answer choices', () => {
    expect(isYoungQuestionSafe(audioQuestion)).toBe(true);
  });

  it('allows visual questions with numeral answer choices', () => {
    expect(isYoungQuestionSafe({
      ...audioQuestion,
      questionType: 'image',
      questionImageUrl: '/q-images/count.svg',
      options: [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }],
    })).toBe(true);
  });

  it('allows three picture options (2026 bank) but not two or five', () => {
    const pic = (n: number) => ({ text: `خيار ${n}`, imageUrl: `/assets/bunyan/4-5/o${n}.png` });
    const base = { ...audioQuestion, questionType: 'image', questionImageUrl: '/assets/bunyan/4-5/scene.png' };
    expect(isYoungQuestionSafe({ ...base, options: [pic(1), pic(2), pic(3)] })).toBe(true);
    expect(isYoungQuestionSafe({ ...base, options: [pic(1), pic(2)] })).toBe(false);
    expect(isYoungQuestionSafe({ ...base, options: [pic(1), pic(2), pic(3), pic(4), pic(5)] })).toBe(false);
  });

  it('rejects text prompts and word-based answer choices for age 4-5', () => {
    expect(getYoungQuestionViolation({
      ...audioQuestion,
      questionType: 'text',
    })).toMatch(/صوتية أو بصرية/);
    expect(getYoungQuestionViolation({
      ...audioQuestion,
      options: [{ text: 'قطة' }, { text: 'كلب' }, { text: 'سمكة' }, { text: 'حصان' }],
    })).toMatch(/بلا كلمات/);
  });

  it('rejects Eastern Arabic digits so numerals stay consistent across the app', () => {
    expect(isYoungQuestionSafe({
      ...audioQuestion,
      options: [{ text: '١' }, { text: '2' }, { text: '3' }, { text: '4' }],
    })).toBe(false);
  });
});
