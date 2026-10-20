import { describe, it, expect } from 'vitest';
import data from '@/lib/db/seeds/mawhiba-l1.json';
import {
  buildMawhibaQuestionRows, mawhibaQuestionId, MAWHIBA_L1, type MawhibaSourceQuestion,
} from '@/lib/mawhiba/questions';
import {
  SKILLS_MAWHIBA_L1, buildSourceIndex, skillKeyForQuestion, getTaxonomy, isMasteryTrack, skillLabel, SKILLS_6_9,
} from '@/lib/mastery/taxonomy';
import { DEFAULT_MASTERY_CONFIG } from '@/lib/mastery/config';
import { questionContentKey } from '@/lib/mastery/service';

const source = data as MawhibaSourceQuestion[];
const rows = buildMawhibaQuestionRows(source);

describe('Mawhiba L1 bank', () => {
  it('has all 607 questions numbered 1..607 with 4 distinct options and a valid key', () => {
    expect(source).toHaveLength(607);
    expect(source.map((q) => q.n)).toEqual(Array.from({ length: 607 }, (_, i) => i + 1));
    for (const q of source) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
    }
  });

  it('builds rows in its own age group with stable, unique UUIDs', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(607);
    expect(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))).toBe(true);
    expect(mawhibaQuestionId(1)).toBe(mawhibaQuestionId(1));
    expect(rows.every((r) => r.ageGroup === MAWHIBA_L1)).toBe(true);
  });

  it('puts the passage in front of every reading question', () => {
    const reading = source.filter((q) => q.type === 'فهم المقروء');
    expect(reading).toHaveLength(32);
    for (const q of reading) {
      const row = rows.find((r) => r.id === mawhibaQuestionId(q.n))!;
      expect(row.questionTextAr.startsWith('📖 ')).toBe(true);
      expect(row.questionTextAr).toContain(q.passage!.text);
      expect(row.questionTextAr.endsWith(q.text)).toBe(true);
    }
  });
});

describe('Mawhiba L1 taxonomy', () => {
  const index = buildSourceIndex(SKILLS_MAWHIBA_L1);

  it('maps every question to exactly one of the 16 skills', () => {
    expect(SKILLS_MAWHIBA_L1).toHaveLength(16);
    for (const r of rows) expect(skillKeyForQuestion(index, r.skillArea, r.subSkill)).not.toBeNull();
  });

  it('gives every skill enough distinct questions to enter the engine', () => {
    for (const skill of SKILLS_MAWHIBA_L1) {
      const texts = new Set(rows
        .filter((r) => skillKeyForQuestion(index, r.skillArea, r.subSkill) === skill.key)
        .map((r) => questionContentKey(r.questionTextAr, r.options)));
      expect(texts.size, skill.key).toBeGreaterThanOrEqual(DEFAULT_MASTERY_CONFIG.minQuestionsPerSkill);
    }
  });

  it('has known prerequisites, no cycles, and keys distinct from the 6-9 track', () => {
    const keys = new Set(SKILLS_MAWHIBA_L1.map((s) => s.key));
    const byKey = new Map(SKILLS_MAWHIBA_L1.map((s) => [s.key, s]));
    for (const s of SKILLS_MAWHIBA_L1) for (const p of s.prerequisites) expect(keys.has(p)).toBe(true);
    const done = new Set<string>();
    const visit = (k: string, path: Set<string>) => {
      expect(path.has(k)).toBe(false);
      if (done.has(k)) return;
      const next = new Set(path).add(k);
      byKey.get(k)!.prerequisites.forEach((p) => visit(p, next));
      done.add(k);
    };
    SKILLS_MAWHIBA_L1.forEach((s) => visit(s.key, new Set()));
    for (const s of SKILLS_6_9) expect(keys.has(s.key)).toBe(false);
  });

  it('is registered as a track', () => {
    expect(isMasteryTrack('mawhiba_l1')).toBe(true);
    expect(isMasteryTrack('10-12')).toBe(false);
    expect(getTaxonomy('mawhiba_l1')).toBe(SKILLS_MAWHIBA_L1);
    expect(skillLabel('m1_reading')?.nameAr).toBe('فهم المقروء');
  });
});
