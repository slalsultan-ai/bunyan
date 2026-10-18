'use client';
import { useEffect, useCallback, useRef, useState } from 'react';
import { PublicQuestion as Question } from '@/types';
import { speakArabic } from '@/lib/speech';
import { getEmojiPattern } from '@/lib/emoji-patterns';
import EmojiPattern from '@/components/practice/EmojiPattern';

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  ageGroup: string;
}

export default function QuestionCard({ question, index, total, ageGroup }: QuestionCardProps) {
  const isYoung = ageGroup === '4-5';
  const isAudio = question.questionType === 'audio';
  const hasSpokenPrompt = isAudio || isYoung;
  const emojiPattern = getEmojiPattern(question.questionImageUrl);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioDataRef = useRef<ArrayBuffer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }, []);

  // HTMLAudioElement plays MP3 reliably on iOS Safari and Android browsers.
  // It is created and started synchronously from the button click below.
  const playPreparedAudio = useCallback(async (buffer: ArrayBuffer) => {
    stopAudio();
    const url = URL.createObjectURL(new Blob([buffer.slice(0)], { type: 'audio/mpeg' }));
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audioRef.current = audio;
    audioUrlRef.current = url;
    audio.onended = stopAudio;
    audio.onerror = stopAudio;
    try {
      await audio.play();
    } catch (error) {
      stopAudio();
      throw error;
    }
  }, [stopAudio]);

  // Cleanup on unmount or question change
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopAudio();
      audioDataRef.current = null;
      setAudioReady(false);
      setAudioLoading(false);
    };
  }, [question.id, stopAudio]);

  // Pre-fetch audio in background as ArrayBuffer
  const prefetchAudio = useCallback(async () => {
    if (!hasSpokenPrompt || audioDataRef.current) return;

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
  }, [question.id, hasSpokenPrompt, question.questionTextAr]);

  // Start prefetch on mount
  useEffect(() => {
    if (!hasSpokenPrompt) return;
    const timer = setTimeout(prefetchAudio, 200);
    return () => clearTimeout(timer);
  }, [prefetchAudio, hasSpokenPrompt]);

  const speak = useCallback(async () => {
    if (!hasSpokenPrompt) return;

    // Calling play() before the first await preserves the mobile user gesture.
    if (audioDataRef.current) {
      try {
        await playPreparedAudio(audioDataRef.current);
        return;
      } catch {
        if (speakArabic(question.questionTextAr)) return;
      }
    }

    // The browser fallback still starts in this tap while MP3 is being prepared.
    speakArabic(question.questionTextAr);
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
    } catch {
      // The fallback above remains available even if the TTS service is offline.
    } finally {
      setAudioLoading(false);
    }
  }, [hasSpokenPrompt, question.questionTextAr, playPreparedAudio]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
          سؤال {index + 1}/{total}
        </span>
      </div>

      {/* The prompt is spoken for every 4-5 question, including visual ones. */}
      {hasSpokenPrompt && (
        <div className="flex flex-col items-center gap-4 py-4">
          <button
            onClick={speak}
            className="w-28 h-28 bg-emerald-100 hover:bg-emerald-200 active:scale-95 rounded-full flex items-center justify-center text-6xl transition-all shadow-md shadow-emerald-100"
            aria-label="استمع للسؤال"
            aria-busy={audioLoading}
          >
            {audioLoading ? (
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : '🔊'}
          </button>
          <p className="text-emerald-700 font-semibold text-sm">
            {audioLoading ? 'يُحضَّر الصوت، ويمكنك الضغط للاستماع الآن' : audioReady ? 'اضغط للاستماع' : 'اضغط للاستماع'}
          </p>
        </div>
      )}

      {/* صورة السؤال */}
      {!isAudio && emojiPattern && (
        <div className="mb-4">
          <EmojiPattern sequence={emojiPattern} />
        </div>
      )}
      {!isAudio && question.questionImageUrl && !emojiPattern && (
        <div className="mb-4 flex justify-center">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <img
              src={question.questionImageUrl}
              alt="صورة السؤال"
              className="h-auto max-h-48 max-w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Text is hidden when the child receives the prompt by audio. */}
      {!isAudio && !isYoung && (
        <p className={`text-gray-900 font-semibold leading-relaxed ${isYoung ? 'text-2xl' : 'text-xl'}`}>
          {question.questionTextAr}
        </p>
      )}
    </div>
  );
}
