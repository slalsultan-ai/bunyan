import { createClient } from '@libsql/client';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(import.meta.dirname, 'migrations');

async function main() {
  const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  // Create _migrations tracking table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Get already-applied migrations
  const applied = await client.execute('SELECT name FROM _migrations ORDER BY name');
  const appliedSet = new Set(applied.rows.map((r) => r.name as string));

  // Read migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // --status flag: just show status and exit
  if (process.argv.includes('--status')) {
    console.log('Migration status:');
    for (const file of files) {
      const status = appliedSet.has(file) ? 'applied' : 'pending';
      console.log(`  ${status === 'applied' ? '\u2713' : '\u2717'} ${file} [${status}]`);
    }
    const pending = files.filter((f) => !appliedSet.has(f));
    console.log(`\n${appliedSet.size} applied, ${pending.length} pending`);
    client.close();
    return;
  }

  // Apply pending migrations
  const pending = files.filter((f) => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log('All migrations are up to date.');
    client.close();
    return;
  }

  console.log(`Applying ${pending.length} migration(s)...`);

  for (const file of pending) {
    const filePath = join(MIGRATIONS_DIR, file);
    const sqlContent = readFileSync(filePath, 'utf-8').trim();

    if (!sqlContent || sqlContent.startsWith('--')) {
      // Skip empty or comment-only files (like 001_initial_schema.sql)
      const hasStatements = sqlContent
        .split('\n')
        .some((line) => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        });

      if (!hasStatements) {
        console.log(`  \u2713 ${file} (marker only)`);
        await client.execute('INSERT INTO _migrations (name) VALUES (?)', [file]);
        continue;
      }
    }

    // Split by semicolons, handling multi-line statements
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    try {
      for (const stmt of statements) {
        // Skip comment-only blocks
        const nonCommentLines = stmt.split('\n').filter((l) => !l.trim().startsWith('--') && l.trim().length > 0);
        if (nonCommentLines.length === 0) continue;

        try {
          await client.execute(stmt);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          // Tolerate "column already exists" and "table already exists" for idempotency
          if (
            msg.includes('duplicate column') ||
            msg.includes('already exists') ||
            msg.includes('Cannot add a column')
          ) {
            // Already applied partially — safe to skip
            continue;
          }
          throw err;
        }
      }
      await client.execute('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`  \u2713 ${file}`);
    } catch (err) {
      console.error(`  \u2717 ${file} FAILED:`);
      console.error(`    ${err instanceof Error ? err.message : err}`);
      client.close();
      process.exit(1);
    }
  }

  console.log('All migrations applied successfully.');
  client.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
