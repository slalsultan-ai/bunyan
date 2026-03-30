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
  const audioDataRef = useRef<ArrayBuffer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Get or create AudioContext (must be resumed in user gesture)
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play an ArrayBuffer through Web Audio API
  const playBuffer = useCallback(async (ac: AudioContext, buffer: ArrayBuffer) => {
    // Stop any currently playing source
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    // decodeAudioData detaches the buffer, so pass a copy
    const decoded = await ac.decodeAudioData(buffer.slice(0));
    const source = ac.createBufferSource();
    source.buffer = decoded;
    source.connect(ac.destination);
    sourceRef.current = source;
    source.start(0);
  }, []);

  // Cleanup on unmount or question change
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      audioDataRef.current = null;
      setAudioReady(false);
      setAudioLoading(false);
    };
  }, [question.id]);

  // Pre-fetch audio in background as ArrayBuffer
  const prefetchAudio = useCallback(async () => {
    if (!isAudio || audioDataRef.current) return;

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

      const buffer = await res.arrayBuffer();
      if (controller.signal.aborted) return;

      audioDataRef.current = buffer;
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

  // Play audio — user gesture creates/resumes AudioContext (iOS requirement)
  const speak = useCallback(async () => {
    if (!isAudio) return;

    // CRITICAL: resume AudioContext in user gesture — unlocks audio on iOS
    const ac = getAudioCtx();

    // If we have pre-fetched audio, play it via Web Audio API
    if (audioDataRef.current) {
      try {
        await playBuffer(ac, audioDataRef.current);
        return;
      } catch {
        // decoding failed — re-fetch below
      }
    }

    // Fetch and play (AudioContext already unlocked, so play works after async)
    setAudioLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: question.questionTextAr }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const buffer = await res.arrayBuffer();
      audioDataRef.current = buffer;
      setAudioReady(true);

      await playBuffer(ac, buffer);
    } catch {
      // Fallback: browser speech synthesis
      speakFallback();
    } finally {
      setAudioLoading(false);
    }
  }, [isAudio, question.questionTextAr, getAudioCtx, playBuffer, speakFallback]);

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
