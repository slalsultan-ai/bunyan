/**
 * Mawhiba practice banks, each stored in the questions table under its own
 * age_group so it never mixes with regular practice:
 *   - Level 1 (grades 3–5): 607 original questions
 *   - Level 2 (grade 6 to intermediate 2): 192 questions from two practice tests
 */

import { createHash } from 'node:crypto';

export const MAWHIBA_L1 = 'mawhiba_l1';
export const MAWHIBA_L2 = 'mawhiba_l2';
export type MawhibaLevel = typeof MAWHIBA_L1 | typeof MAWHIBA_L2;

export interface MawhibaSourceQuestion {
  n: number;
  section: 'math' | 'spatial' | 'science' | 'verbal' | 'flexibility';
  type: string;
  text: string;
  options: string[];
  correct: number;
  passage?: { title: string; text: string };
  /** How to reach the answer; computed questions were re-solved to verify the key. */
  explanation?: string;
  /** false = kept in the source but not served (e.g. pure-recall science items). */
  active?: boolean;
  /** Figure shown above the options (a public path under /assets/bunyan/). */
  imageUrl?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export const SECTION_SKILL_AREA: Record<MawhibaSourceQuestion['section'], string> = {
  math: 'quantitative',
  spatial: 'spatial',
  science: 'scientific',
  verbal: 'verbal',
  flexibility: 'flexibility',
};

/** Stable id per question number, so re-running the import never duplicates. */
export function mawhibaQuestionId(n: number, level: MawhibaLevel = MAWHIBA_L1): string {
  const h = createHash('sha1').update(`${level}:${n}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function mawhibaQuestionText(q: MawhibaSourceQuestion): string {
  if (!q.passage) return q.text;
  return `📖 ${q.passage.title}\n${q.passage.text}\n\n${q.text}`;
}

export function buildMawhibaQuestionRows(data: MawhibaSourceQuestion[], level: MawhibaLevel = MAWHIBA_L1) {
  return data.map((q) => ({
    id: mawhibaQuestionId(q.n, level),
    skillArea: SECTION_SKILL_AREA[q.section],
    subSkill: q.type,
    ageGroup: level,
    difficulty: q.difficulty ?? 'medium',
    questionType: q.imageUrl ? 'image' : 'text',
    questionImageUrl: q.imageUrl ?? null,
    questionTextAr: mawhibaQuestionText(q),
    options: q.options.map((text) => ({ text })),
    correctOptionIndex: q.correct,
    explanationAr: q.explanation ?? '',
    isActive: q.active !== false,
    tags: [level, `${level}#${q.n}`],
    source: level,
  }));
}
