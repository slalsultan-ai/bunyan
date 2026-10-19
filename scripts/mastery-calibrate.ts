/**
 * Fit BKT parameters per unified skill from historical practice answers.
 *
 *   npx tsx scripts/mastery-calibrate.ts            # dry run: print fitted params
 *   npx tsx scripts/mastery-calibrate.ts --write    # upsert into mastery_bkt_params
 *
 * Uses TURSO_DATABASE_URL (falls back to file:./local.db). Skills with fewer
 * than MIN_ANSWERS answers keep the code defaults.
 */
import { createClient } from '@libsql/client';
import { fitBkt } from '../src/lib/mastery/engine';
import { SKILLS_6_9, buildSourceIndex, skillKeyForQuestion } from '../src/lib/mastery/taxonomy';

const MIN_ANSWERS = 200;

async function main() {
  const write = process.argv.includes('--write');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });
  const index = buildSourceIndex(SKILLS_6_9);

  const rows = await client.execute(`
    SELECT s.child_id AS child_id, q.skill_area AS skill_area, q.sub_skill AS sub_skill, sa.is_correct AS is_correct
    FROM session_answers sa
    JOIN sessions s ON s.id = sa.session_id
    JOIN questions q ON q.id = sa.question_id
    WHERE s.child_id IS NOT NULL AND q.age_group = '6-9' AND sa.is_correct IS NOT NULL
    ORDER BY s.started_at, sa.id
  `);

  // skill → child → answer sequence
  const sequences = new Map<string, Map<string, boolean[]>>();
  for (const r of rows.rows) {
    const skill = skillKeyForQuestion(index, String(r.skill_area), String(r.sub_skill));
    if (!skill) continue;
    const byChild = sequences.get(skill) ?? new Map<string, boolean[]>();
    const seq = byChild.get(String(r.child_id)) ?? [];
    seq.push(Number(r.is_correct) === 1);
    byChild.set(String(r.child_id), seq);
    sequences.set(skill, byChild);
  }

  console.log(`Answers considered: ${rows.rows.length}\n`);
  console.log('skill'.padEnd(22), 'n'.padStart(6), 'children'.padStart(9), '  P(L0)  T     S     G     logL');
  for (const skill of SKILLS_6_9) {
    const seqs = [...(sequences.get(skill.key)?.values() ?? [])];
    const n = seqs.reduce((a, s) => a + s.length, 0);
    if (n < MIN_ANSWERS) {
      console.log(skill.key.padEnd(22), String(n).padStart(6), String(seqs.length).padStart(9), '  (too few answers — defaults kept)');
      continue;
    }
    const fit = fitBkt(seqs)!;
    const p = fit.params;
    console.log(
      skill.key.padEnd(22), String(n).padStart(6), String(seqs.length).padStart(9),
      ' ', p.pInit.toFixed(2), ' ', p.pTransit.toFixed(2), p.pSlip.toFixed(2), ' ', p.pGuess!.toFixed(2), ' ', fit.logLikelihood.toFixed(1),
    );
    if (write) {
      await client.execute({
        sql: `INSERT INTO mastery_bkt_params (skill_key, p_init, p_transit, p_slip, p_guess, sample_size, fitted_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(skill_key) DO UPDATE SET p_init = excluded.p_init, p_transit = excluded.p_transit,
                p_slip = excluded.p_slip, p_guess = excluded.p_guess, sample_size = excluded.sample_size,
                fitted_at = excluded.fitted_at`,
        args: [skill.key, p.pInit, p.pTransit, p.pSlip, p.pGuess!, n],
      });
    }
  }
  if (!write) console.log('\nDry run — pass --write to store these parameters.');
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
