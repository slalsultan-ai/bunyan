/**
 * Import the Mawhiba Level 1 bank. Idempotent: existing rows (including any
 * admin edits) are left untouched.
 *
 *   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npx tsx src/lib/db/seed-mawhiba-l1.ts
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildMawhibaQuestionRows, type MawhibaSourceQuestion } from '../mawhiba/questions';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, 'seeds', 'mawhiba-l1.json'), 'utf-8')) as MawhibaSourceQuestion[];
  const rows = buildMawhibaQuestionRows(data);
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  const before = await client.execute(`SELECT COUNT(*) AS n FROM questions WHERE age_group = 'mawhiba_l1'`);
  const stmts = rows.map((r) => ({
    sql: `INSERT OR IGNORE INTO questions
      (id, skill_area, sub_skill, age_group, difficulty, question_type, question_text_ar, question_image_url,
       options, correct_option_index, explanation_ar, tags, is_active, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 1, ?)`,
    args: [r.id, r.skillArea, r.subSkill, r.ageGroup, r.difficulty, r.questionType, r.questionTextAr,
      JSON.stringify(r.options), r.correctOptionIndex, r.explanationAr, JSON.stringify(r.tags), r.source],
  }));
  for (let i = 0; i < stmts.length; i += 100) {
    await client.batch(stmts.slice(i, i + 100), 'write');
  }
  const after = await client.execute(`SELECT COUNT(*) AS n FROM questions WHERE age_group = 'mawhiba_l1'`);
  console.log(`Mawhiba L1 questions: ${before.rows[0].n} → ${after.rows[0].n} (source rows: ${rows.length})`);
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
