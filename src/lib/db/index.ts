import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import * as schema from './schema';

// Indexes created once per process — IF NOT EXISTS makes them idempotent
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_sessions_guest_id    ON sessions(guest_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_started_at  ON sessions(started_at)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_ip          ON sessions(ip_address)',
  'CREATE INDEX IF NOT EXISTS idx_questions_lookup     ON questions(age_group, skill_area, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_questions_active     ON questions(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_sa_question_id       ON session_answers(question_id)',
  'CREATE INDEX IF NOT EXISTS idx_sa_session_id        ON session_answers(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_gp_total_points      ON guest_progress(total_points DESC)',
];

let indexesEnsured = false;

async function ensureIndexes(client: Client): Promise<void> {
  for (const stmt of INDEXES) {
    try { await client.execute(stmt); } catch { /* already exists or unsupported */ }
  }
}

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL || 'file:./local.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;

    const client = createClient({
      url,
      ...(authToken ? { authToken } : {}),
    });

    db = drizzle(client, { schema });

    if (!indexesEnsured) {
      indexesEnsured = true;
      void ensureIndexes(client); // fire-and-forget — doesn't block first request
    }
  }
  return db;
}
