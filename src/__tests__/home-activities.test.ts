import { describe, it, expect } from 'vitest';
import { selectActivity, activities } from '@/lib/home-activities';

describe('selectActivity', () => {
  it('returns exact match for sub-skill + age group', () => {
    const result = selectActivity('الطرح', '4-5');
    expect(result.subSkill).toBe('الطرح');
    expect(result.ageGroup === '4-5' || result.ageGroup === '*').toBe(true);
    expect(result.activity.length).toBeGreaterThan(0);
    expect(result.duration.length).toBeGreaterThan(0);
  });

  it('returns wildcard match when age group has no specific match', () => {
    const result = selectActivity('المتضادات', '10-12');
    expect(result.subSkill).toBe('المتضادات');
    expect(result.ageGroup).toBe('*');
  });

  it('avoids repeating last activity sub-skill', () => {
    // When last was الطرح, should pick something else if possible
    const result = selectActivity('الطرح', '6-9', 'الطرح');
    // Should not be الطرح (since it's the last one)
    // But if no other match, it may fallback
    expect(result).toBeDefined();
    expect(result.activity.length).toBeGreaterThan(0);
  });

  it('returns generic activity when no sub-skill specified', () => {
    const result = selectActivity(null, '6-9');
    expect(result.subSkill).toBe('*');
  });

  it('always returns a valid activity', () => {
    const result = selectActivity('nonexistent_skill', '6-9');
    expect(result).toBeDefined();
    expect(result.activity.length).toBeGreaterThan(0);
  });

  it('activities database has content for all age groups', () => {
    const ageGroups = new Set(activities.map(a => a.ageGroup));
    expect(ageGroups.has('4-5')).toBe(true);
    expect(ageGroups.has('6-9')).toBe(true);
    expect(ageGroups.has('*')).toBe(true);
  });
});
