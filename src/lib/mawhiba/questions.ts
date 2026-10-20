/**
 * Mawhiba Level 1 practice bank (607 original questions in the style of the
 * Mawhiba multiple-abilities scale, grades 3–5). Stored in the questions
 * table under its own age_group so it never mixes with regular practice.
 */

import { createHash } from 'node:crypto';

export const MAWHIBA_L1 = 'mawhiba_l1';

export interface MawhibaSourceQuestion {
  n: number;
  section: 'math' | 'spatial' | 'science' | 'verbal';
  type: string;
  text: string;
  options: string[];
  correct: number;
  passage?: { title: string; text: string };
}

export const SECTION_SKILL_AREA: Record<MawhibaSourceQuestion['section'], string> = {
  math: 'quantitative',
  spatial: 'spatial',
  science: 'scientific',
  verbal: 'verbal',
};

/** Stable id per question number, so re-running the import never duplicates. */
export function mawhibaQuestionId(n: number): string {
  const h = createHash('sha1').update(`${MAWHIBA_L1}:${n}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function mawhibaQuestionText(q: MawhibaSourceQuestion): string {
  if (!q.passage) return q.text;
  return `📖 ${q.passage.title}\n${q.passage.text}\n\n${q.text}`;
}

export function buildMawhibaQuestionRows(data: MawhibaSourceQuestion[]) {
  return data.map((q) => ({
    id: mawhibaQuestionId(q.n),
    skillArea: SECTION_SKILL_AREA[q.section],
    subSkill: q.type,
    ageGroup: MAWHIBA_L1,
    difficulty: 'medium',
    questionType: 'text',
    questionTextAr: mawhibaQuestionText(q),
    options: q.options.map((text) => ({ text })),
    correctOptionIndex: q.correct,
    explanationAr: '',
    tags: [MAWHIBA_L1, `${MAWHIBA_L1}#${q.n}`],
    source: MAWHIBA_L1,
  }));
}
