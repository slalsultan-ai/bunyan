/**
 * Cleanup fake/spam sessions and recompute guestProgress from real data.
 *
 * A session is fake if ANY of:
 *   1. No answers in session_answers AND time_taken_ms < 500  (submitted empty, too fast)
 *   2. No answers in session_answers AND time_taken_ms IS NULL
 *   3. The guestId had more than 50 sessions in a single calendar day (bulk script attack)
 *
 * After deletion, guestProgress is recomputed from scratch for every affected guest.
 *
 * Run: npx tsx src/lib/db/cleanup-fake-sessions.ts
 * Add --dry-run to preview without deleting.
 */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — no changes will be made ===' : '=== LIVE RUN ===');

  const [totalRow] = (await client.execute('SELECT COUNT(*) as cnt FROM sessions')).rows;
  console.log(`\nTotal sessions before: ${totalRow.cnt}`);

  // ── Criteria 1: no answers + (speed 0 or null time) ──────────────────
  // Sessions with no answers AND suspiciously fast time (< 500ms) are fake submissions.
  // Sessions with no answers AND time_taken_ms IS NULL are legitimately abandoned (started but not completed) — do NOT delete.
  const noAnswers = await client.execute(`
    SELECT s.id FROM sessions s
    LEFT JOIN session_answers sa ON sa.session_id = s.id
    WHERE sa.id IS NULL
      AND s.time_taken_ms IS NOT NULL
      AND s.time_taken_ms < 500
  `);
  const noAnswerIds = noAnswers.rows.map(r => r.id as string);
  console.log(`\nCriteria 1 — no answers + too fast: ${noAnswerIds.length} sessions`);

  // ── Criteria 2: guestId with >50 sessions on any single day ──────────
  const bulkGuests = await client.execute(`
    SELECT guest_id, DATE(started_at) as day, COUNT(*) as cnt
    FROM sessions
    GROUP BY guest_id, DATE(started_at)
    HAVING cnt > 50
    ORDER BY cnt DESC
  `);
  console.log(`\nCriteria 2 — bulk attack days: ${bulkGuests.rows.length} (guestId, day) pairs`);
  bulkGuests.rows.forEach(r => console.log(`  guest ${String(r.guest_id).slice(0, 16)}... on ${r.day}: ${r.cnt} sessions`));

  // Collect session IDs for bulk days — keep only the first 50 per (guest, day), delete the rest
  const bulkIds: string[] = [];
  for (const row of bulkGuests.rows) {
    const overflow = await client.execute({
      sql: `
        SELECT id FROM sessions
        WHERE guest_id = ? AND DATE(started_at) = ?
        ORDER BY started_at ASC
        LIMIT -1 OFFSET 50
      `,
      args: [row.guest_id as string, row.day as string],
    });
    overflow.rows.forEach(r => bulkIds.push(r.id as string));
  }
  console.log(`  → sessions to delete from bulk overflow: ${bulkIds.length}`);

  // ── Union of all fake session IDs ─────────────────────────────────────
  const allFakeIds = [...new Set([...noAnswerIds, ...bulkIds])];
  console.log(`\nTotal fake sessions to delete: ${allFakeIds.length}`);

  if (allFakeIds.length === 0) {
    console.log('\nNothing to clean up.');
    await client.close();
    return;
  }

  // Which guests are affected?
  const affectedGuests = new Set<string>();
  for (const id of allFakeIds) {
    const row = await client.execute({ sql: 'SELECT guest_id FROM sessions WHERE id = ?', args: [id] });
    const gid = row.rows[0]?.guest_id as string | null;
    if (gid) affectedGuests.add(gid);
  }
  console.log(`Affected guests: ${affectedGuests.size}`);

  if (DRY_RUN) {
    console.log('\n-- DRY RUN complete, nothing deleted --');
    await client.close();
    return;
  }

  // ── Delete in batches of 50 ───────────────────────────────────────────
  const BATCH = 50;
  let deleted = 0;
  for (let i = 0; i < allFakeIds.length; i += BATCH) {
    const batch = allFakeIds.slice(i, i + BATCH);
    const placeholders = batch.map(() => '?').join(',');
    await client.execute({ sql: `DELETE FROM session_answers WHERE session_id IN (${placeholders})`, args: batch });
    await client.execute({ sql: `DELETE FROM sessions WHERE id IN (${placeholders})`, args: batch });
    deleted += batch.length;
    process.stdout.write(`\rDeleted ${deleted}/${allFakeIds.length}...`);
  }
  console.log('\n✓ Sessions deleted');

  // ── Recompute guestProgress for affected guests ───────────────────────
  console.log('\nRecomputing guestProgress for affected guests...');
  for (const guestId of affectedGuests) {
    const real = await client.execute({
      sql: `
        SELECT
          COUNT(*) as total_sessions,
          COALESCE(SUM(score), 0) as total_correct,
          COALESCE(SUM(total_questions), 0) as total_answered,
          COALESCE(SUM(points_earned), 0) as total_points,
          MAX(DATE(completed_at)) as last_practice
        FROM sessions
        WHERE guest_id = ? AND completed_at IS NOT NULL
      `,
      args: [guestId],
    });
    const r = real.rows[0];

    if (!r || (r.total_sessions as number) === 0) {
      // No real sessions left — delete progress record entirely
      await client.execute({ sql: `DELETE FROM guest_progress WHERE guest_id = ?`, args: [guestId] });
      console.log(`  ${guestId.slice(0, 16)}... → removed (no real sessions)`);
    } else {
      await client.execute({
        sql: `
          UPDATE guest_progress SET
            total_sessions = ?,
            total_correct = ?,
            total_answered = ?,
            total_points = ?,
            last_practice_date = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE guest_id = ?
        `,
        args: [r.total_sessions, r.total_correct, r.total_answered, r.total_points, r.last_practice, guestId],
      });
      console.log(`  ${guestId.slice(0, 16)}... → ${r.total_sessions} sessions, ${r.total_points} pts`);
    }
  }

  const [afterRow] = (await client.execute('SELECT COUNT(*) as cnt FROM sessions')).rows;
  console.log(`\n✓ Total sessions after cleanup: ${afterRow.cnt}`);

  await client.close();
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
