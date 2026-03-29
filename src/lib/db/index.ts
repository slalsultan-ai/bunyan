import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import type { Client } from '@libsql/client';
import * as schema from './schema';

// Executed once per process to ensure schema is up-to-date without requiring migrations
const SETUP_STMTS = [
  // ─── New columns on existing sessions table ───────────────────────────────
  'ALTER TABLE sessions ADD COLUMN parent_id TEXT',
  'ALTER TABLE sessions ADD COLUMN child_id TEXT',
  'ALTER TABLE sessions ADD COLUMN ip_address TEXT',

  // ─── New tables ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    city TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT,
    weekly_email_enabled INTEGER DEFAULT 1,
    current_week_number INTEGER DEFAULT 1,
    unsubscribe_token TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    age_group TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS parent_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_email_content (
    id TEXT PRIMARY KEY NOT NULL,
    week_number INTEGER NOT NULL,
    age_group TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id TEXT PRIMARY KEY NOT NULL,
    parent_id TEXT NOT NULL REFERENCES parents(id),
    week_number INTEGER NOT NULL,
    sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    resend_id TEXT
  )`,

  // ─── Indexes ──────────────────────────────────────────────────────────────
  'CREATE INDEX IF NOT EXISTS idx_sessions_guest_id    ON sessions(guest_id)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_started_at  ON sessions(started_at)',
  'CREATE INDEX IF NOT EXISTS idx_sessions_ip          ON sessions(ip_address)',
  'CREATE INDEX IF NOT EXISTS idx_questions_lookup     ON questions(age_group, skill_area, is_active)',
  'CREATE INDEX IF NOT EXISTS idx_questions_active     ON questions(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_sa_question_id       ON session_answers(question_id)',
  'CREATE INDEX IF NOT EXISTS idx_sa_session_id        ON session_answers(session_id)',
  'CREATE INDEX IF NOT EXISTS idx_gp_total_points      ON guest_progress(total_points DESC)',
  'CREATE INDEX IF NOT EXISTS idx_parents_email        ON parents(email)',
  'CREATE INDEX IF NOT EXISTS idx_children_parent_id   ON children(parent_id)',
  'CREATE INDEX IF NOT EXISTS idx_otp_email            ON otp_codes(email)',
  'CREATE INDEX IF NOT EXISTS idx_ps_parent_id         ON parent_sessions(parent_id)',
  'CREATE INDEX IF NOT EXISTS idx_wec_week_age         ON weekly_email_content(week_number, age_group)',
  'CREATE INDEX IF NOT EXISTS idx_el_parent_id         ON email_log(parent_id)',
];

let setupDone = false;

async function runSetup(client: Client): Promise<void> {
  for (const stmt of SETUP_STMTS) {
    try { await client.execute(stmt); } catch { /* already exists, column duplicate, etc. */ }
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

    if (!setupDone) {
      setupDone = true;
      void runSetup(client); // fire-and-forget — doesn't block first request
    }
  }
  return db;
}
