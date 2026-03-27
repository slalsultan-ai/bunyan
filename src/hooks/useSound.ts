'use client';
import { useCallback, useRef } from 'react';

export function useSound(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  // تشغيل نغمة بسيطة
  const tone = useCallback((ac: AudioContext, freq: number, start: number, dur: number, vol = 0.25, type: OscillatorType = 'sine') => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }, []);

  // ✅ إجابة صحيحة — ثلاث نغمات تصاعدية مبهجة
  const playCorrect = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((f, i) => tone(ac, f, now + i * 0.1, 0.4, 0.22));
  }, [muted, ctx, tone]);

  // ❌ إجابة خاطئة — نغمة هابطة
  const playWrong = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.45);
  }, [muted, ctx]);

  // 🎉 نهاية مثالية — لحن احتفالي
  const playFanfare = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    const now = ac.currentTime;
    const melody: [number, number, number][] = [
      [523, 0, 0.15], [659, 0.15, 0.15], [784, 0.3, 0.15],
      [1047, 0.45, 0.25], [784, 0.7, 0.1], [880, 0.8, 0.1],
      [1047, 0.9, 0.6],
    ];
    melody.forEach(([f, t, d]) => tone(ac, f, now + t, d, 0.28));
  }, [muted, ctx, tone]);

  // 🔵 انتقال للسؤال التالي — نقرة خفيفة
  const playNext = useCallback(() => {
    if (muted) return;
    const ac = ctx();
    if (!ac) return;
    tone(ac, 880, ac.currentTime, 0.08, 0.1, 'sine');
  }, [muted, ctx, tone]);

  return { playCorrect, playWrong, playFanfare, playNext };
}
