import { Badge, GuestState } from '@/types';

export const BADGES: Badge[] = [
  { id: 'starter', name: 'نجمة البداية', criteria: 'أكمل أول جلسة', icon: '⭐' },
  { id: 'achiever', name: 'متفوق', criteria: 'حصل على 10/10', icon: '🏆' },
  { id: 'persistent', name: 'مثابر', criteria: 'streak 7 أيام', icon: '🔥' },
  { id: 'math_genius', name: 'عبقري الأرقام', criteria: '50 سؤال كمي', icon: '🔢' },
  { id: 'word_king', name: 'ملك الكلمات', criteria: '50 سؤال لفظي', icon: '📖' },
  { id: 'detective', name: 'محقق', criteria: '50 سؤال منطقي', icon: '🔍' },
  { id: 'champion', name: 'بطل القدرات', criteria: 'كل الشارات', icon: '👑' },
];

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export function checkNewBadges(state: GuestState, sessionResult: {
  score: number;
  totalQuestions: number;
  skillArea: string;
  quantitativeTotal: number;
  verbalTotal: number;
  logicalTotal: number;
}): string[] {
  const newBadges: string[] = [];
  const existing = new Set(state.badges);

  if (!existing.has('starter') && state.totalSessions >= 1) {
    newBadges.push('starter');
  }
  if (!existing.has('achiever') && sessionResult.score === sessionResult.totalQuestions && sessionResult.totalQuestions === 10) {
    newBadges.push('achiever');
  }
  if (!existing.has('persistent') && state.currentStreak >= 7) {
    newBadges.push('persistent');
  }
  if (!existing.has('math_genius') && sessionResult.quantitativeTotal >= 50) {
    newBadges.push('math_genius');
  }
  if (!existing.has('word_king') && sessionResult.verbalTotal >= 50) {
    newBadges.push('word_king');
  }
  if (!existing.has('detective') && sessionResult.logicalTotal >= 50) {
    newBadges.push('detective');
  }

  const allEarned = [...existing, ...newBadges];
  const prerequisiteIds = ['starter', 'achiever', 'persistent', 'math_genius', 'word_king', 'detective'];
  if (!existing.has('champion') && prerequisiteIds.every(id => allEarned.includes(id))) {
    newBadges.push('champion');
  }

  return newBadges;
}
