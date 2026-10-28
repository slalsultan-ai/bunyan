/**
 * Import a Mawhiba bank (level 1 by default, `--level 2` for level 2).
 *
 *   npx tsx src/lib/db/seed-mawhiba.ts [--level 2]            # insert missing rows only (keeps admin edits)
 *   npx tsx src/lib/db/seed-mawhiba.ts [--level 2] --update   # also sync text/options/key/explanation/active/
 *                                                              # image of rows not edited by an admin since import
 *
 * Uses TURSO_DATABASE_URL (falls back to file:./local.db).
 */
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildMawhibaQuestionRows, MAWHIBA_L1, MAWHIBA_L2, type MawhibaSourceQuestion } from '../mawhiba/questions';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const update = process.argv.includes('--update');
  const levelArg = process.argv[process.argv.indexOf('--level') + 1];
  const level = process.argv.includes('--level') && levelArg === '2' ? MAWHIBA_L2 : MAWHIBA_L1;
  const file = level === MAWHIBA_L2 ? 'mawhiba-l2.json' : 'mawhiba-l1.json';
  const data = JSON.parse(readFileSync(join(__dirname, 'seeds', file), 'utf-8')) as MawhibaSourceQuestion[];
  const rows = buildMawhibaQuestionRows(data, level);
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });

  const before = await client.execute(`SELECT COUNT(*) AS n FROM questions WHERE age_group = '${level}'`);
  const inserts = rows.map((r) => ({
    sql: `INSERT OR IGNORE INTO questions
      (id, skill_area, sub_skill, age_group, difficulty, question_type, question_text_ar, question_image_url,
       options, correct_option_index, explanation_ar, tags, is_active, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [r.id, r.skillArea, r.subSkill, r.ageGroup, r.difficulty, r.questionType, r.questionTextAr, r.questionImageUrl,
      JSON.stringify(r.options), r.correctOptionIndex, r.explanationAr, JSON.stringify(r.tags), r.isActive ? 1 : 0, r.source],
  }));
  for (let i = 0; i < inserts.length; i += 100) await client.batch(inserts.slice(i, i + 100), 'write');

  let updated = 0;
  if (update) {
    // Rows an admin touched (audit log) are left alone.
    const edited = await client.execute(
      `SELECT details FROM admin_audit_log WHERE action LIKE 'question_%'`,
    );
    const editedIds = new Set<string>();
    for (const e of edited.rows) {
      try { const id = JSON.parse(String(e.details)).id; if (id) editedIds.add(id); } catch { /* ignore */ }
    }
    const updates = rows.filter((r) => !editedIds.has(r.id)).map((r) => ({
      sql: `UPDATE questions SET question_text_ar = ?, options = ?, correct_option_index = ?, explanation_ar = ?,
              is_active = ?, skill_area = ?, sub_skill = ?, age_group = ?, question_image_url = ?,
              question_type = ?, difficulty = ?
            WHERE id = ?`,
      args: [r.questionTextAr, JSON.stringify(r.options), r.correctOptionIndex, r.explanationAr,
        r.isActive ? 1 : 0, r.skillArea, r.subSkill, r.ageGroup, r.questionImageUrl, r.questionType, r.difficulty, r.id],
    }));
    for (let i = 0; i < updates.length; i += 100) await client.batch(updates.slice(i, i + 100), 'write');
    updated = updates.length;
    if (editedIds.size) console.log(`Skipped ${[...editedIds].filter((id) => rows.some((r) => r.id === id)).length} admin-edited rows`);
  }

  const after = await client.execute(
    `SELECT COUNT(*) AS n, SUM(is_active) AS active, SUM(CASE WHEN explanation_ar <> '' THEN 1 ELSE 0 END) AS explained
     FROM questions WHERE age_group = '${level}'`,
  );
  const a = after.rows[0];
  console.log(`${level}: ${before.rows[0].n} → ${a.n} rows (active ${a.active}, with explanation ${a.explained})${update ? `, synced ${updated}` : ''}`);
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
