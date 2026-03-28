/**
 * Migration: add ip_address column to sessions table
 * Run once: npx tsx src/lib/db/migrate-add-ip.ts
 */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  try {
    await client.execute(`ALTER TABLE sessions ADD COLUMN ip_address TEXT`);
    console.log('✓ ip_address column added to sessions');
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('duplicate column')) {
      console.log('✓ ip_address column already exists — skipping');
    } else {
      throw e;
    }
  }
  await client.close();
}

run().catch(e => { console.error('✗', e.message); process.exit(1); });
