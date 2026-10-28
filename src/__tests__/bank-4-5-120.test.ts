import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import data from '@/lib/db/seeds/bank-4-5-120.json';
import { buildBank45Rows, bank45QuestionId, type Bank45SourceQuestion } from '@/lib/bank-4-5/questions';
import { buildMawhibaQuestionRows, MAWHIBA_L1, MAWHIBA_L2, type MawhibaSourceQuestion } from '@/lib/mawhiba/questions';
import l1 from '@/lib/db/seeds/mawhiba-l1.json';
import l2 from '@/lib/db/seeds/mawhiba-l2.json';
import { isYoungQuestionSafe } from '@/lib/young-question-policy';
import { sanitizeQuestionImageUrl } from '@/lib/question-image-url';

const source = data as Bank45SourceQuestion[];
const rows = buildBank45Rows(source);

describe('4-5 bank (120 questions)', () => {
  it('has 40 quantitative, 40 verbal and 40 logical questions numbered 1..120', () => {
    expect(source.map((q) => q.n)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1));
    const by = (a: string) => source.filter((q) => q.skillArea === a).length;
    expect([by('quantitative'), by('verbal'), by('logical_patterns')]).toEqual([40, 40, 40]);
    expect(new Set(source.map((q) => q.subSkill)).size).toBe(27);
  });

  it('has 3 picture options, one key in range, a spoken text and a rationale per question', () => {
    for (const q of source) {
      expect(q.options).toHaveLength(3);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(2);
      expect(q.text.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
    }
  });

  it('ships every scene and option image, all accepted by the URL sanitizer', () => {
    for (const q of source) {
      for (const url of [q.imageUrl, ...q.options.map((o) => o.imageUrl)]) {
        expect(sanitizeQuestionImageUrl(url)).toBe(url);
        expect(existsSync(join(process.cwd(), 'public', url))).toBe(true);
      }
    }
  });

  it('passes the 4-5 policy, so children are actually served every question', () => {
    expect(rows.every((r) => isYoungQuestionSafe(r))).toBe(true);
  });

  it('uses stable ids that never collide with other imported banks', () => {
    expect(new Set(rows.map((r) => r.id)).size).toBe(120);
    expect(bank45QuestionId(1)).toBe(bank45QuestionId(1));
    const others = new Set([
      ...buildMawhibaQuestionRows(l1 as MawhibaSourceQuestion[], MAWHIBA_L1).map((r) => r.id),
      ...buildMawhibaQuestionRows(l2 as MawhibaSourceQuestion[], MAWHIBA_L2).map((r) => r.id),
    ]);
    expect(rows.some((r) => others.has(r.id))).toBe(false);
  });

  it('matches the migration that loads it (regenerate 044 when the seed changes)', () => {
    const sql = readFileSync(join(process.cwd(), 'src/lib/db/migrations/044_bank_4_5_120.sql'), 'utf-8');
    expect(sql.match(/^INSERT OR IGNORE INTO questions/gm)).toHaveLength(120);
    for (const r of rows) {
      expect(sql).toContain(`'${r.id}'`);
      expect(sql).toContain(`'${JSON.stringify(r.options).replace(/'/g, "''")}'`);
    }
  });
});
