import type { AgeGroup } from '@/types';

/** Client-safe age group computation (mirrors server-side computeAgeGroup) */
export function computeAgeGroupClient(age: number): AgeGroup {
  if (age <= 5) return '4-5';
  if (age <= 9) return '6-9';
  return '10-12';
}
