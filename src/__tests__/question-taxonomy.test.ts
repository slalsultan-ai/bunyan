import { describe, it, expect } from 'vitest';
import {
  QUESTION_AGE_GROUPS, QUESTION_SKILL_AREAS, SKILL_AREAS_BY_AGE_GROUP,
  questionAgeGroupLabel, questionSkillAreaLabel,
} from '@/lib/question-taxonomy';
import { roundDownForDisplay, formatCount } from '@/lib/public-content-format';

describe('question taxonomy', () => {
  it('knows the Mawhiba track and its new skill areas', () => {
    expect(QUESTION_AGE_GROUPS.map(a => a.value)).toContain('mawhiba_l1');
    expect(QUESTION_SKILL_AREAS.map(s => s.value)).toEqual(expect.arrayContaining(['spatial', 'scientific']));
  });

  it('labels every value in Arabic instead of the raw key', () => {
    expect(questionAgeGroupLabel('mawhiba_l1')).toBe('موهبة ١');
    expect(questionSkillAreaLabel('spatial')).toBe('استدلال مكاني');
    expect(questionSkillAreaLabel('scientific')).toBe('علمي وميكانيكي');
    expect(questionSkillAreaLabel('mixed')).toBe('مزيج');
    for (const a of QUESTION_AGE_GROUPS) expect(questionAgeGroupLabel(a.value)).not.toMatch(/[a-z_]/);
  });

  it('maps every age group to skill areas that exist', () => {
    const skills = new Set<string>(QUESTION_SKILL_AREAS.map(s => s.value));
    for (const a of QUESTION_AGE_GROUPS) {
      expect(SKILL_AREAS_BY_AGE_GROUP[a.value]?.length).toBeGreaterThan(0);
      for (const s of SKILL_AREAS_BY_AGE_GROUP[a.value]) expect(skills.has(s)).toBe(true);
    }
  });
});

describe('public content counts', () => {
  it('rounds down so the public "N+" never overstates the bank', () => {
    expect(roundDownForDisplay(708)).toBe(700);
    expect(roundDownForDisplay(657)).toBe(650);
    expect(roundDownForDisplay(64)).toBe(60);
    expect(formatCount(1281)).toBe('1,250+');
  });
});
