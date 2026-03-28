import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const total = await client.execute('SELECT COUNT(*) as cnt FROM sessions');
  console.log('Total sessions:', total.rows[0].cnt);

  const byGuest = await client.execute(`
    SELECT guest_id, COUNT(*) as cnt, MIN(completed_at) as first, MAX(completed_at) as last
    FROM sessions
    GROUP BY guest_id
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.log('\nTop 20 guests by session count:');
  byGuest.rows.forEach(r => console.log(r));

  const nullGuest = await client.execute(`
    SELECT COUNT(*) as cnt, MIN(completed_at) as first, MAX(completed_at) as last
    FROM sessions WHERE guest_id IS NULL
  `);
  console.log('\nSessions with no guest_id:', nullGuest.rows[0]);

  const byDay = await client.execute(`
    SELECT DATE(completed_at) as day, COUNT(*) as cnt
    FROM sessions
    GROUP BY DATE(completed_at)
    ORDER BY day DESC
    LIMIT 14
  `);
  console.log('\nSessions per day (last 14 days):');
  byDay.rows.forEach(r => console.log(r));

  const suspicious = await client.execute(`
    SELECT guest_id, score, total_questions, points_earned, time_taken_ms, completed_at
    FROM sessions
    ORDER BY completed_at DESC
    LIMIT 30
  `);
  console.log('\nLast 30 sessions:');
  suspicious.rows.forEach(r => console.log(r));

  await client.close();
}

main();
