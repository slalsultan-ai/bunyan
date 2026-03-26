import { getTodayDateString } from '@/lib/utils';

export function calculateStreak(lastPracticeDate: string | null, currentStreak: number): {
  newStreak: number;
  isFirstSessionToday: boolean;
} {
  const today = getTodayDateString();

  if (!lastPracticeDate) {
    return { newStreak: 1, isFirstSessionToday: true };
  }

  if (lastPracticeDate === today) {
    return { newStreak: currentStreak, isFirstSessionToday: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastPracticeDate === yesterdayStr) {
    return { newStreak: currentStreak + 1, isFirstSessionToday: true };
  }

  return { newStreak: 1, isFirstSessionToday: true };
}
