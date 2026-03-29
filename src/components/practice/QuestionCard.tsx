'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
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
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioBlobUrl = useRef<string | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount or question change
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioEl.current) {
        audioEl.current.pause();
        audioEl.current.src = '';
        audioEl.current = null;
      }
      if (audioBlobUrl.current) {
        URL.revokeObjectURL(audioBlobUrl.current);
        audioBlobUrl.current = null;
      }
      setAudioReady(false);
      setAudioLoading(false);
    };
  }, [question.id]);

  // Pre-fetch audio in background (for auto-play on first load)
  const prefetchAudio = useCallback(async () => {
    if (!isAudio || audioBlobUrl.current) return;

    setAudioLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question.questionTextAr }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      if (controller.signal.aborted) return;

      if (audioBlobUrl.current) URL.revokeObjectURL(audioBlobUrl.current);
      audioBlobUrl.current = URL.createObjectURL(blob);
      setAudioReady(true);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('TTS prefetch failed, will use fallback on click');
      }
    } finally {
      if (!controller.signal.aborted) setAudioLoading(false);
    }
  }, [question.id, isAudio, question.questionTextAr]);

  // Start prefetch on mount
  useEffect(() => {
    if (!isAudio) return;
    const timer = setTimeout(prefetchAudio, 200);
    return () => clearTimeout(timer);
  }, [prefetchAudio, isAudio]);

  // Play audio — must be called from user gesture for iOS
  const speak = useCallback(async () => {
    if (!isAudio) return;

    // If we have pre-fetched audio, play it directly
    if (audioBlobUrl.current) {
      // Create a fresh Audio for each play (iOS Safari requires this pattern)
      const audio = new Audio(audioBlobUrl.current);
      audioEl.current = audio;
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — user will need to tap again
      }
      return;
    }

    // No cached audio — fetch and play within user gesture
    // On iOS, we create the Audio element FIRST (in user gesture), then set src
    const audio = new Audio();
    audioEl.current = audio;

    setAudioLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question.questionTextAr }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      if (audioBlobUrl.current) URL.revokeObjectURL(audioBlobUrl.current);
      const url = URL.createObjectURL(blob);
      audioBlobUrl.current = url;
      setAudioReady(true);

      audio.src = url;
      await audio.play();
    } catch {
      // Fallback: browser speech synthesis
      speakFallback();
    } finally {
      setAudioLoading(false);
    }
  }, [isAudio, question.questionTextAr]);

  const speakFallback = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.questionTextAr);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice =
      voices.find(v => v.lang.startsWith('ar') && !v.name.includes('Google') && v.localService) ||
      voices.find(v => v.lang.startsWith('ar') && !v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    window.speechSynthesis.speak(utterance);
  }, [question.questionTextAr]);

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
            disabled={audioLoading}
            className="w-28 h-28 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-full flex items-center justify-center text-6xl transition-all shadow-md shadow-emerald-100 disabled:opacity-60"
            aria-label="استمع للسؤال"
          >
            {audioLoading ? (
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : '🔊'}
          </button>
          <p className="text-emerald-700 font-semibold text-sm">
            {audioLoading ? 'جاري التحميل...' : 'اضغط للاستماع'}
          </p>
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
