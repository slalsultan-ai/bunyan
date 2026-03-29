'use client';

import { GuestState, SkillStats, SessionSummary, AgeGroup, SkillArea } from '@/types';
import { generateGuestId, getTodayDateString } from '@/lib/utils';
import { getLevelForPoints } from '@/lib/gamification/levels';
import { calculateStreak } from '@/lib/gamification/streaks';
import { calculateSessionPoints } from '@/lib/gamification/points';
import { checkNewBadges } from '@/lib/gamification/badges';

const STORAGE_KEY = 'bunyan_guest';

export function getInitialGuestState(): GuestState {
  return {
    guestId: generateGuestId(),
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    badges: [],
    totalSessions: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    lastPracticeDate: null,
    sessionHistory: [],
  };
}

export function loadGuestState(): GuestState {
  if (typeof window === 'undefined') return getInitialGuestState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialGuestState();
      saveGuestState(initial);
      return initial;
    }
    return JSON.parse(raw) as GuestState;
  } catch {
    return getInitialGuestState();
  }
}

export function saveGuestState(state: GuestState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export interface SessionResult {
  sessionId: string;
  ageGroup: AgeGroup;
  skillArea: SkillArea;
  score: number;
  totalQuestions: number;
  timeTakenMs: number;
  answers: Array<{ questionId: string; skillArea: string; isCorrect: boolean }>;
}

export function updateGuestStateAfterSession(
  state: GuestState,
  result: SessionResult
): { newState: GuestState; pointsEarned: number; newBadges: string[] } {
  const { newStreak, isFirstSessionToday } = calculateStreak(
    state.lastPracticeDate,
    state.currentStreak
  );

  const pointsEarned = calculateSessionPoints(
    result.score,
    result.totalQuestions,
    isFirstSessionToday,
    newStreak
  );

  const newTotalPoints = state.totalPoints + pointsEarned;
  const newLevel = getLevelForPoints(newTotalPoints).level;

  // Build per-answer skill stats (handles 'mixed' sessions correctly)
  const prevStats: SkillStats = state.skillStats ?? {
    quantitative: { correct: 0, total: 0 },
    verbal: { correct: 0, total: 0 },
    logical_patterns: { correct: 0, total: 0 },
  };
  const newSkillStats: SkillStats = {
    quantitative: { ...prevStats.quantitative },
    verbal: { ...prevStats.verbal },
    logical_patterns: { ...prevStats.logical_patterns },
  };
  for (const answer of result.answers) {
    const skill = answer.skillArea as keyof SkillStats;
    if (skill in newSkillStats) {
      newSkillStats[skill].total++;
      if (answer.isCorrect) newSkillStats[skill].correct++;
    }
  }

  // Legacy badge calculations (session-level, unchanged)
  const quantitativeTotal = (state.sessionHistory || [])
    .filter(s => s.skillArea === 'quantitative')
    .reduce((acc, s) => acc + s.score, 0) +
    (result.skillArea === 'quantitative' ? result.score : 0);

  const verbalTotal = (state.sessionHistory || [])
    .filter(s => s.skillArea === 'verbal')
    .reduce((acc, s) => acc + s.score, 0) +
    (result.skillArea === 'verbal' ? result.score : 0);

  const logicalTotal = (state.sessionHistory || [])
    .filter(s => s.skillArea === 'logical_patterns')
    .reduce((acc, s) => acc + s.score, 0) +
    (result.skillArea === 'logical_patterns' ? result.score : 0);

  const updatedState: GuestState = {
    ...state,
    totalPoints: newTotalPoints,
    currentLevel: newLevel,
    currentStreak: newStreak,
    longestStreak: Math.max(state.longestStreak, newStreak),
    totalSessions: state.totalSessions + 1,
    totalCorrect: state.totalCorrect + result.score,
    totalAnswered: state.totalAnswered + result.totalQuestions,
    lastPracticeDate: getTodayDateString(),
    sessionHistory: [
      {
        id: result.sessionId,
        ageGroup: result.ageGroup,
        skillArea: result.skillArea,
        score: result.score,
        totalQuestions: result.totalQuestions,
        pointsEarned: pointsEarned,
        timeTakenMs: result.timeTakenMs,
        completedAt: new Date().toISOString(),
      },
      ...(state.sessionHistory || []).slice(0, 49),
    ],
    badges: state.badges,
    skillStats: newSkillStats,
  };

  const newBadges = checkNewBadges(updatedState, {
    score: result.score,
    totalQuestions: result.totalQuestions,
    skillArea: result.skillArea,
    quantitativeTotal,
    verbalTotal,
    logicalTotal,
  });

  updatedState.badges = [...state.badges, ...newBadges];

  return { newState: updatedState, pointsEarned, newBadges };
}

export function getSkillBreakdown(state: GuestState) {
  // Prefer per-answer skillStats (accurate, counts mixed sessions)
  if (state.skillStats) {
    return state.skillStats;
  }

  // Fallback for old localStorage data: session-level breakdown
  const history = state.sessionHistory || [];
  const breakdown = {
    quantitative: { correct: 0, total: 0 },
    verbal: { correct: 0, total: 0 },
    logical_patterns: { correct: 0, total: 0 },
  };

  for (const session of history) {
    const skill = session.skillArea as keyof typeof breakdown;
    if (skill in breakdown) {
      breakdown[skill].correct += session.score;
      breakdown[skill].total += session.totalQuestions;
    }
  }

  return breakdown;
}

export function getWeakestSkill(state: GuestState): SkillArea | null {
  const breakdown = getSkillBreakdown(state);
  let weakest: SkillArea | null = null;
  let lowestRate = Infinity;

  for (const [skill, data] of Object.entries(breakdown)) {
    if (data.total === 0) continue;
    const rate = data.correct / data.total;
    if (rate < lowestRate) {
      lowestRate = rate;
      weakest = skill as SkillArea;
    }
  }

  return weakest;
}
