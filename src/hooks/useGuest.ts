'use client';
import { useState, useEffect, useCallback } from 'react';
import { GuestState } from '@/types';
import { loadGuestState, saveGuestState, updateGuestStateAfterSession, SessionResult } from '@/lib/guest';
import { getLevelForPoints, getLevelProgress, getNextLevel } from '@/lib/gamification/levels';

export function useGuest() {
  const [state, setState] = useState<GuestState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loaded = loadGuestState();
    setState(loaded);
    setMounted(true);
  }, []);

  const recordSession = useCallback((result: SessionResult) => {
    if (!state) return { pointsEarned: 0, newBadges: [] as string[] };
    const { newState, pointsEarned, newBadges } = updateGuestStateAfterSession(state, result);
    setState(newState);
    saveGuestState(newState);
    return { pointsEarned, newBadges };
  }, [state]);

  const level = state ? getLevelForPoints(state.totalPoints) : null;
  const levelProgress = state ? getLevelProgress(state.totalPoints) : 0;
  const nextLevel = level ? getNextLevel(level.level) : null;

  return { state, mounted, recordSession, level, levelProgress, nextLevel };
}
