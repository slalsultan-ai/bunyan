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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup blob URL on unmount or question change
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [question.id]);

  // Fetch TTS audio from server
  const fetchAudio = useCallback(async () => {
    if (!isAudio || typeof window === 'undefined') return;

    setAudioLoading(true);
    setAudioReady(false);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question.questionTextAr }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      setAudioReady(true);
      setAudioLoading(false);

      // Auto-play
      audio.play().catch(() => {});
    } catch {
      // Fallback to browser speech synthesis
      setAudioLoading(false);
      speakFallback();
    }
  }, [question.id, isAudio, question.questionTextAr]);

  const speakFallback = useCallback(() => {
    if (!window.speechSynthesis) return;
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

  const speak = useCallback(() => {
    if (!isAudio) return;
    // If audio is cached, just replay it
    if (audioRef.current && audioReady) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    // Otherwise fetch it
    fetchAudio();
  }, [isAudio, audioReady, fetchAudio]);

  // Auto-fetch audio when question loads
  useEffect(() => {
    if (!isAudio) return;
    const timer = setTimeout(fetchAudio, 200);
    return () => clearTimeout(timer);
  }, [fetchAudio, isAudio]);

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
            {audioLoading ? 'جاري التحميل...' : 'اضغط للاستماع مجدداً'}
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
