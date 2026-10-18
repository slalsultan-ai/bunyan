import { describe, expect, it } from 'vitest';
import { sanitizeQuestionImageUrl } from '@/lib/question-image-url';

describe('sanitizeQuestionImageUrl', () => {
  it('allows the bundled young-question image paths', () => {
    expect(sanitizeQuestionImageUrl('/assets/bunyan/4-5/pattern_01.png'))
      .toBe('/assets/bunyan/4-5/pattern_01.png');
  });

  it('accepts HTTP(S) and rejects data URIs and untrusted local paths', () => {
    expect(sanitizeQuestionImageUrl('https://cdn.example.test/image.png'))
      .toBe('https://cdn.example.test/image.png');
    expect(sanitizeQuestionImageUrl('data:image/png;base64,abc')).toBeNull();
    expect(sanitizeQuestionImageUrl('/uploads/unverified.png')).toBeNull();
  });
});
