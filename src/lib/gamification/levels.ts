import { Level } from '@/types';

export const LEVELS: Level[] = [
  { level: 1, name: 'مبتدئ', pointsRequired: 0 },
  { level: 2, name: 'مستكشف', pointsRequired: 200 },
  { level: 3, name: 'متعلم', pointsRequired: 500 },
  { level: 4, name: 'متميز', pointsRequired: 1000 },
  { level: 5, name: 'خبير', pointsRequired: 2000 },
  { level: 6, name: 'عبقري', pointsRequired: 4000 },
  { level: 7, name: 'أسطورة', pointsRequired: 7000 },
];

export function getLevelForPoints(points: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (points >= level.pointsRequired) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(currentLevel: number): Level | null {
  return LEVELS.find(l => l.level === currentLevel + 1) || null;
}

export function getLevelProgress(points: number): number {
  const current = getLevelForPoints(points);
  const next = getNextLevel(current.level);
  if (!next) return 100;
  const range = next.pointsRequired - current.pointsRequired;
  const earned = points - current.pointsRequired;
  return Math.min(100, Math.round((earned / range) * 100));
}
