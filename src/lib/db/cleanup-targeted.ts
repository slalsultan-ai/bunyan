/**
 * Targeted cleanup of confirmed fake/corrupt sessions:
 *
 *  1. Bot guest 932f43fd — 20 sessions from AWS bot IP (18.141.206.15)
 *     submitted within 37 seconds, all identical answers, time_taken_ms=60000 exactly.
 *  2. Corrupt session de6e9fb1 — claims 8/10 score but has zero answers in session_answers.
 *  3. Test guest aaaaaaaa-bbbb-4ccc — fake UUID, 2 sessions.
 *
 * Run: npx tsx src/lib/db/cleanup-targeted.ts [--dry-run]
 */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const DRY_RUN = process.argv.includes('--dry-run');

async function deleteSessionsForGuest(guestId: string, label: string) {
  const rows = await client.execute({ sql: 'SELECT id FROM sessions WHERE guest_id = ?', args: [guestId] });
  const ids = rows.rows.map(r => r.id as string);
  console.log(`  ${label}: ${ids.length} sessions`);
  if (ids.length === 0 || DRY_RUN) return 0;

  const ph = ids.map(() => '?').join(',');
  await client.execute({ sql: `DELETE FROM session_answers WHERE session_id IN (${ph})`, args: ids });
  await client.execute({ sql: `DELETE FROM sessions WHERE id IN (${ph})`, args: ids });
  await client.execute({ sql: 'DELETE FROM guest_progress WHERE guest_id = ?', args: [guestId] });
  return ids.length;
}

async function deleteSession(sessionId: string, guestId: string, label: string) {
  console.log(`  ${label}: session ${sessionId}`);
  if (DRY_RUN) return 0;

  await client.execute({ sql: 'DELETE FROM session_answers WHERE session_id = ?', args: [sessionId] });
  await client.execute({ sql: 'DELETE FROM sessions WHERE id = ?', args: [sessionId] });

  // Recompute guest_progress from remaining real sessions
  const real = await client.execute({
    sql: `SELECT COUNT(*) as s, COALESCE(SUM(score),0) as c, COALESCE(SUM(total_questions),0) as a, COALESCE(SUM(points_earned),0) as p, MAX(DATE(completed_at)) as last
          FROM sessions WHERE guest_id = ? AND completed_at IS NOT NULL`,
    args: [guestId],
  });
  const r = real.rows[0];
  if ((r.s as number) === 0) {
    await client.execute({ sql: 'DELETE FROM guest_progress WHERE guest_id = ?', args: [guestId] });
    console.log(`    → guest_progress removed (no remaining sessions)`);
  } else {
    await client.execute({
      sql: `UPDATE guest_progress SET total_sessions=?, total_correct=?, total_answered=?, total_points=?, last_practice_date=?, updated_at=CURRENT_TIMESTAMP WHERE guest_id=?`,
      args: [r.s, r.c, r.a, r.p, r.last, guestId],
    });
    console.log(`    → guest_progress updated: ${r.s} sessions, ${r.p} pts`);
  }
  return 1;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');

  const [before] = (await client.execute('SELECT COUNT(*) as cnt FROM sessions')).rows;
  console.log(`\nSessions before: ${before.cnt}`);

  console.log('\n-- Deleting bot guest (932f43fd) --');
  const d1 = await deleteSessionsForGuest('932f43fd-d87b-4bcf-ba34-e5212626402c', 'Bot AWS 18.141.206.15');

  console.log('\n-- Deleting corrupt session (de6e9fb1) --');
  const d2 = await deleteSession('de6e9fb1-913e-4fa3-bd92-727b80cfe170', 'd1714f78-292e-4a40-8c98-67cbc1b5d03c', 'No answers, fake score 8/10');

  console.log('\n-- Deleting fake guest (aaaaaaaa) --');
  const d3 = await deleteSessionsForGuest('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', 'Fake UUID test guest');

  const totalDeleted = d1 + d2 + d3;
  if (!DRY_RUN) {
    const [after] = (await client.execute('SELECT COUNT(*) as cnt FROM sessions')).rows;
    console.log(`\n✓ Deleted: ${totalDeleted} sessions`);
    console.log(`✓ Sessions after: ${after.cnt}`);
  } else {
    console.log(`\n-- DRY RUN: would delete ${20 + 1 + 2} sessions --`);
  }

  await client.close();
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
