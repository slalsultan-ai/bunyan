import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import data from '@/lib/db/seeds/mawhiba-l2.json';
import l1data from '@/lib/db/seeds/mawhiba-l1.json';
import {
  buildMawhibaQuestionRows, mawhibaQuestionId, MAWHIBA_L1, MAWHIBA_L2, type MawhibaSourceQuestion,
} from '@/lib/mawhiba/questions';
import { SKILLS_MAWHIBA_L2, buildSourceIndex, getTaxonomy, isMasteryTrack, isMawhibaTrack } from '@/lib/mastery/taxonomy';
import { DEFAULT_MASTERY_CONFIG } from '@/lib/mastery/config';
import { sanitizeQuestionImageUrl } from '@/lib/question-image-url';

const source = data as MawhibaSourceQuestion[];
const rows = buildMawhibaQuestionRows(source, MAWHIBA_L2);

describe('Mawhiba L2 bank', () => {
  it('has 192 questions (2 tests × 4 sections × 24) with 4 distinct options and a valid key', () => {
    expect(source).toHaveLength(192);
    expect(source.map((q) => q.n)).toEqual(Array.from({ length: 192 }, (_, i) => i + 1));
    for (const q of source) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
      expect(q.explanation?.trim().length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    }
  });

  it('stores rows under mawhiba_l2 with ids that never collide with level 1', () => {
    expect(rows.every((r) => r.ageGroup === MAWHIBA_L2)).toBe(true);
    const l1Ids = new Set(buildMawhibaQuestionRows(l1data as MawhibaSourceQuestion[], MAWHIBA_L1).map((r) => r.id));
    expect(new Set(rows.map((r) => r.id)).size).toBe(192);
    expect(rows.some((r) => l1Ids.has(r.id))).toBe(false);
    expect(mawhibaQuestionId(1, MAWHIBA_L2)).not.toBe(mawhibaQuestionId(1));
  });

  it('serves every drawn question with its figure from public/, as an image question', () => {
    const drawn = source.filter((q) => q.imageUrl);
    expect(drawn).toHaveLength(26);
    for (const q of drawn) {
      expect(sanitizeQuestionImageUrl(q.imageUrl)).toBe(q.imageUrl);
      expect(existsSync(join(process.cwd(), 'public', q.imageUrl!))).toBe(true);
    }
    const figureOnly = source.filter((q) => q.options[0] === 'الشكل ١');
    expect(figureOnly).toHaveLength(14);
    expect(figureOnly.every((q) => q.imageUrl)).toBe(true);
    expect(rows.filter((r) => r.questionImageUrl).every((r) => r.questionType === 'image')).toBe(true);
  });

  it('maps every question to exactly one skill, each with enough questions', () => {
    expect(isMasteryTrack('mawhiba_l2')).toBe(true);
    expect(isMawhibaTrack('mawhiba_l2')).toBe(true);
    expect(getTaxonomy('mawhiba_l2')).toBe(SKILLS_MAWHIBA_L2);
    const index = buildSourceIndex(SKILLS_MAWHIBA_L2);
    const perSkill = new Map<string, number>();
    for (const r of rows) {
      const skill = index.get(`${r.skillArea}::${r.subSkill}`);
      expect(skill, `${r.skillArea}/${r.subSkill}`).toBeDefined();
      perSkill.set(skill!, (perSkill.get(skill!) ?? 0) + 1);
    }
    expect(perSkill.size).toBe(SKILLS_MAWHIBA_L2.length);
    for (const n of perSkill.values()) expect(n).toBeGreaterThanOrEqual(DEFAULT_MASTERY_CONFIG.minQuestionsPerSkill);
  });

  it('puts the passage in front of every reading question', () => {
    const reading = source.filter((q) => q.type === 'فهم المقروء');
    expect(reading).toHaveLength(18);
    for (const q of reading) {
      const row = rows.find((r) => r.id === mawhibaQuestionId(q.n, MAWHIBA_L2))!;
      expect(row.questionTextAr.startsWith('📖 ')).toBe(true);
    }
  });

  it('matches the production migration that loads it (regenerate 043 when the seed changes)', () => {
    const sql = readFileSync(join(process.cwd(), 'src/lib/db/migrations/043_mawhiba_l2_questions.sql'), 'utf-8');
    expect(sql.match(/^INSERT OR IGNORE INTO questions/gm)).toHaveLength(192);
    for (const r of rows) {
      expect(sql).toContain(`'${r.id}'`);
      expect(sql).toContain(`'${JSON.stringify(r.options).replace(/'/g, "''")}'`);
    }
  });
});
