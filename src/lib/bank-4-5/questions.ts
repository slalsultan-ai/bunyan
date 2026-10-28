/**
 * The 4–5 bank of 120 questions (40 quantitative, 40 verbal, 40 logical),
 * October 2026. Every question is spoken (the text is read to the child), has
 * a scene image and three picture options cropped from the reviewed source
 * cards, so what the child sees is exactly what was approved.
 */

import { createHash } from 'node:crypto';

export const BANK_4_5_SOURCE = 'bank-4-5-120';

export interface Bank45SourceQuestion {
  n: number;
  /** Card id in the source, e.g. «ك-12». */
  ref: string;
  skillArea: 'quantitative' | 'verbal' | 'logical_patterns';
  subSkill: string;
  difficulty: 'easy' | 'medium' | 'hard';
  /** Read aloud to the child. */
  text: string;
  imageUrl: string;
  options: Array<{ text: string; imageUrl: string }>;
  correct: number;
  explanation: string;
}

/** Stable id per question number, so the import can never duplicate. */
export function bank45QuestionId(n: number): string {
  const h = createHash('sha1').update(`${BANK_4_5_SOURCE}:${n}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-b${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export function buildBank45Rows(data: Bank45SourceQuestion[]) {
  return data.map((q) => ({
    id: bank45QuestionId(q.n),
    skillArea: q.skillArea,
    subSkill: q.subSkill,
    ageGroup: '4-5',
    difficulty: q.difficulty,
    questionType: 'image',
    questionTextAr: q.text,
    questionImageUrl: q.imageUrl,
    options: q.options,
    correctOptionIndex: q.correct,
    explanationAr: q.explanation,
    isActive: true,
    tags: [BANK_4_5_SOURCE, `${BANK_4_5_SOURCE}#${q.ref}`],
    source: BANK_4_5_SOURCE,
  }));
}
