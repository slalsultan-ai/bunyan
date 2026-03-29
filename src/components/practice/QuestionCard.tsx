'use client';
import { useEffect, useCallback } from 'react';
import { PublicQuestion as Question } from '@/types';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  ageGroup: string;
}

export default function QuestionCard({ question, index, total, ageGroup }: QuestionCardProps) {
  const isYoung = ageGroup === '4-5';
  const isAudio = question.questionType === 'audio';

  const speak = useCallback(() => {
    if (!isAudio) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question.questionTextAr);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Pick the best available Arabic voice
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice =
        // Prefer local/premium voices (not "Google" remote)
        voices.find(v => v.lang.startsWith('ar') && !v.name.includes('Google') && v.localService) ||
        // Then any non-Google Arabic voice
        voices.find(v => v.lang.startsWith('ar') && !v.name.includes('Google')) ||
        // Fallback to any Arabic voice
        voices.find(v => v.lang.startsWith('ar'));
      if (arabicVoice) utterance.voice = arabicVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis not available:', e);
    }
  }, [question.id, isAudio, question.questionTextAr]);

  useEffect(() => {
    if (!isAudio || typeof window === 'undefined' || !window.speechSynthesis) return;
    // Voices load asynchronously in some browsers — wait for them
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        speak();
      } else {
        // Voices not loaded yet — wait for onvoiceschanged
        const handler = () => { speak(); window.speechSynthesis.removeEventListener('voiceschanged', handler); };
        window.speechSynthesis.addEventListener('voiceschanged', handler);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
      }
    };
    const timer = setTimeout(trySpeak, 300);
    return () => {
      clearTimeout(timer);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [speak, isAudio]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          سؤال {index + 1}/{total}
        </span>
      </div>

      {/* سؤال صوتي */}
      {isAudio && (
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onClick={speak}
            className="w-28 h-28 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-full flex items-center justify-center text-6xl transition-all shadow-md shadow-emerald-100"
            aria-label="استمع للسؤال"
          >
            🔊
          </button>
          <p className="text-emerald-700 font-semibold text-sm">اضغط للاستماع مجدداً</p>
        </div>
      )}

      {/* صورة السؤال */}
      {!isAudio && question.questionImageUrl && (
        <div className="mb-4 flex justify-center">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <img
              src={question.questionImageUrl}
              alt="صورة السؤال"
              className="max-h-48 object-contain"
            />
          </div>
        </div>
      )}

      {/* نص السؤال — مخفي للأسئلة الصوتية */}
      {!isAudio && (
        <p className={`text-gray-900 font-semibold leading-relaxed ${isYoung ? 'text-2xl' : 'text-xl'}`}>
          {question.questionTextAr}
        </p>
      )}
    </div>
  );
}
