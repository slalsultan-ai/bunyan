/**
 * Starts browser speech only from a user action. This keeps the fallback usable
 * on mobile Safari when a generated audio file has not finished loading yet.
 */
export function speakArabic(text: string): boolean {
  if (
    typeof window === 'undefined'
    || !text.trim()
    || !window.speechSynthesis
    || typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    return false;
  }

  try {
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    synthesis.resume();

    const utterance = new SpeechSynthesisUtterance(prepareArabicSpeech(text));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;

    const voices = synthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ar-sa'))
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
import { prepareArabicSpeech } from '@/lib/arabic-speech';
