import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const before = await client.execute('SELECT COUNT(*) as cnt FROM sessions');
  console.log('Sessions before cleanup:', before.rows[0].cnt);

  // Spam sessions: no guest_id, zero time, zero points — impossible in real usage
  const preview = await client.execute(`
    SELECT COUNT(*) as cnt FROM sessions
    WHERE guest_id IS NULL AND time_taken_ms = 0 AND points_earned = 0
  `);
  console.log('Spam sessions to delete:', preview.rows[0].cnt);

  // Delete orphaned session_answers first (FK)
  await client.execute(`
    DELETE FROM session_answers WHERE session_id IN (
      SELECT id FROM sessions
      WHERE guest_id IS NULL AND time_taken_ms = 0 AND points_earned = 0
    )
  `);

  // Delete the spam sessions
  await client.execute(`
    DELETE FROM sessions
    WHERE guest_id IS NULL AND time_taken_ms = 0 AND points_earned = 0
  `);

  const after = await client.execute('SELECT COUNT(*) as cnt FROM sessions');
  console.log('Sessions after cleanup:', after.rows[0].cnt);

  await client.close();
}

main();
