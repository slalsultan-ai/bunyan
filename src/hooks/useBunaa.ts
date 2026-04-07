'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFeatureFlag } from './useFeatureFlag';
import { getBunaaMessage, type BunaaMessage, type MessageContext } from '@/lib/mascot/bunaa-messages';
import {
  shouldShowBunaa,
  updateBunaaState,
  createInitialState,
  getAnswerEvent,
  type BunaaState,
  type MascotFrequency,
} from '@/lib/mascot/bunaa-state';

const STORAGE_KEY = 'bunaa_frequency';
const AUTO_HIDE_MS = 4000;
const IDLE_TIMEOUT_MS = 30_000;

function getStoredFrequency(): MascotFrequency {
  if (typeof window === 'undefined') return 'medium';
  return (localStorage.getItem(STORAGE_KEY) as MascotFrequency) || 'medium';
}

export function useBunaa() {
  const { enabled } = useFeatureFlag('mascot_bunaa');
  const [state, setState] = useState<BunaaState>(createInitialState);
  const [message, setMessage] = useState<BunaaMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const [frequency, setFrequencyState] = useState<MascotFrequency>('medium');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load frequency from localStorage
  useEffect(() => {
    setFrequencyState(getStoredFrequency());
  }, []);

  const setFrequency = useCallback((f: MascotFrequency) => {
    setFrequencyState(f);
    localStorage.setItem(STORAGE_KEY, f);
  }, []);

  const trigger = useCallback(
    (event: MessageContext) => {
      if (!enabled) return;

      setState((prev) => {
        if (!shouldShowBunaa(prev, event, frequency)) return prev;

        const msg = getBunaaMessage(event, prev.lastMessageText);
        setMessage(msg);
        setVisible(true);

        // Auto-hide
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);

        return updateBunaaState(prev, event, { messageText: msg.text });
      });
    },
    [enabled, frequency]
  );

  const onAnswer = useCallback(
    (isCorrect: boolean, difficulty?: string) => {
      if (!enabled) return;

      setState((prev) => {
        const event = getAnswerEvent(isCorrect, prev.currentStreak, difficulty);

        // Update state with answer data first
        let next = updateBunaaState(prev, event, { isCorrect });

        if (!shouldShowBunaa(prev, event, frequency)) return next;

        const msg = getBunaaMessage(event, prev.lastMessageText);
        setMessage(msg);
        setVisible(true);

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);

        next = { ...next, lastMessageText: msg.text, messagesShownCount: next.messagesShownCount + 1, lastMessageTime: Date.now() };
        return next;
      });

      // Reset idle timer
      resetIdleTimer();
    },
    [enabled, frequency]
  );

  const hide = useCallback(() => {
    setVisible(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  // Idle timer: trigger after 30s of no answers
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!enabled) return;

    idleTimerRef.current = setTimeout(() => {
      trigger('idle_30s');
    }, IDLE_TIMEOUT_MS);
  }, [enabled, trigger]);

  // Start idle timer on mount
  useEffect(() => {
    if (enabled) resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [enabled]);

  return {
    enabled,
    message,
    visible,
    trigger,
    onAnswer,
    hide,
    state,
    frequency,
    setFrequency,
  };
}
