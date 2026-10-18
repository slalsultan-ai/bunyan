import { describe, expect, it } from 'vitest';
import { escapeSpeechXml, prepareArabicSpeech } from '@/lib/arabic-speech';

describe('Arabic speech preparation', () => {
  it('reads Western and Eastern digits as Arabic words with natural punctuation', () => {
    expect(prepareArabicSpeech('اختر الرقم 5')).toBe('اختر الرقم خمسة۔');
    expect(prepareArabicSpeech('اختر الرقم ٧؟')).toBe('اختر الرقم سبعة؟');
  });

  it('normalizes whitespace and pauses without changing a question ending', () => {
    expect(prepareArabicSpeech('  أين الكرة،\nفوق الصندوق؟  '))
      .toBe('أين الكرة، فوق الصندوق؟');
  });

  it('escapes text embedded in the package SSML template', () => {
    expect(escapeSpeechXml('أقل من 3 & أكبر من 1'))
      .toBe('أقل من 3 &amp; أكبر من 1');
  });
});
