import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakArabic } from '@/lib/speech';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('speakArabic', () => {
  it('returns false when browser speech is unavailable', () => {
    expect(speakArabic('مرحبا')).toBe(false);
  });

  it('cancels, resumes, and starts Arabic speech from a supported browser', () => {
    const cancel = vi.fn();
    const resume = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal('window', {
      speechSynthesis: {
        cancel,
        resume,
        getVoices: () => [{ lang: 'ar-SA' }],
        speak,
      },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      lang = '';
      rate = 1;
      voice: unknown;
      constructor(public text: string) {}
    });

    expect(speakArabic('ما لون الكرة؟')).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(resume).toHaveBeenCalledOnce();
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'ما لون الكرة؟', lang: 'ar-SA', rate: 0.9 });
  });
});
