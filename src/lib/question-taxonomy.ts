/**
 * Single source for the question bank's age groups and skill areas, with
 * their Arabic labels. Admin filters, the coverage matrix, charts, previews
 * and the question form all read from here so a new track (e.g. Mawhiba)
 * shows up everywhere at once.
 */

export const QUESTION_AGE_GROUPS = [
  { value: '4-5', label: '4-5 سنوات' },
  { value: '6-9', label: '6-9 سنوات' },
  { value: '10-12', label: '10-12 سنة' },
  { value: 'mawhiba_l1', label: 'موهبة ١' },
  { value: 'mawhiba_l2', label: 'موهبة ٢' },
] as const;

export const QUESTION_SKILL_AREAS = [
  { value: 'quantitative', label: 'كمي', icon: '🔢' },
  { value: 'verbal', label: 'لفظي', icon: '📖' },
  { value: 'logical_patterns', label: 'تفكير منطقي', icon: '🧩' },
  { value: 'spatial', label: 'استدلال مكاني', icon: '🧊' },
  { value: 'scientific', label: 'علمي وميكانيكي', icon: '⚙️' },
  { value: 'flexibility', label: 'المرونة العقلية', icon: '🔄' },
] as const;

/** Skill areas each age group's content is built from (coverage matrix cells). */
export const SKILL_AREAS_BY_AGE_GROUP: Record<string, readonly string[]> = {
  '4-5': ['quantitative', 'verbal', 'logical_patterns'],
  '6-9': ['quantitative', 'verbal', 'logical_patterns'],
  '10-12': ['quantitative', 'verbal', 'logical_patterns'],
  mawhiba_l1: ['quantitative', 'verbal', 'spatial', 'scientific'],
  mawhiba_l2: ['verbal', 'flexibility', 'quantitative', 'spatial', 'scientific'],
};

export const ADMIN_AGE_GROUP_VALUES = new Set<string>(QUESTION_AGE_GROUPS.map(a => a.value));
export const ADMIN_SKILL_AREA_VALUES = new Set<string>([...QUESTION_SKILL_AREAS.map(s => s.value), 'mixed']);

const AGE_LABELS: Record<string, string> = Object.fromEntries(QUESTION_AGE_GROUPS.map(a => [a.value, a.label]));
const SKILL_LABELS: Record<string, string> = {
  ...Object.fromEntries(QUESTION_SKILL_AREAS.map(s => [s.value, s.label])),
  mixed: 'مزيج',
};
const SKILL_ICONS: Record<string, string> = {
  ...Object.fromEntries(QUESTION_SKILL_AREAS.map(s => [s.value, s.icon])),
  mixed: '🎯',
};

export function questionAgeGroupLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return AGE_LABELS[value] ?? value;
}

export function questionSkillAreaLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return SKILL_LABELS[value] ?? value;
}

export function questionSkillAreaIcon(value: string | null | undefined): string {
  return (value && SKILL_ICONS[value]) || '';
}
