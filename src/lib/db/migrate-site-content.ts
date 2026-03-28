import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sql } from 'drizzle-orm';

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  });
  const db = drizzle(client);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS site_content (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ site_content table ready');

  // verify write works
  await db.run(sql`INSERT OR REPLACE INTO site_content (key, value) VALUES ('__test__', '"ok"')`);
  const rows = await client.execute(`SELECT key FROM site_content WHERE key = '__test__'`);
  await db.run(sql`DELETE FROM site_content WHERE key = '__test__'`);
  console.log('✓ read/write verified:', rows.rows.length === 1 ? 'pass' : 'FAIL');

  process.exit(0);
}

run().catch(e => { console.error('✗', e.message); process.exit(1); });
