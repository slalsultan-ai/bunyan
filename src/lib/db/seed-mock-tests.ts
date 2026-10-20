/**
 * Create the pre-built mock tests (10-12) if none exist yet. Idempotent.
 *
 *   TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npx tsx src/lib/db/seed-mock-tests.ts
 */
import { sql } from 'drizzle-orm';
import { getDb } from './index';
import { seedMockTests } from './seeds/mock-tests-seed';

async function main() {
  const db = getDb();
  const [row] = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM mock_tests`);
  if (Number(row?.n ?? 0) > 0) {
    console.log(`mock_tests already has ${row.n} rows — nothing to do.`);
    return;
  }
  await seedMockTests();
  const [after] = await db.all<{ n: number }>(sql`SELECT COUNT(*) AS n FROM mock_tests`);
  console.log(`mock_tests: 0 → ${after.n}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
