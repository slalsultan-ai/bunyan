import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const stmts = [
  `CREATE TABLE IF NOT EXISTS questions (id text PRIMARY KEY NOT NULL, skill_area text NOT NULL, sub_skill text NOT NULL, age_group text NOT NULL, difficulty text NOT NULL, question_type text NOT NULL, question_text_ar text NOT NULL, question_image_url text, options text NOT NULL, correct_option_index integer NOT NULL, explanation_ar text NOT NULL, tags text, is_active integer DEFAULT 1, created_at text DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS sessions (id text PRIMARY KEY NOT NULL, guest_id text, age_group text NOT NULL, skill_area text NOT NULL, difficulty text, started_at text DEFAULT CURRENT_TIMESTAMP, completed_at text, score integer, total_questions integer DEFAULT 10, points_earned integer DEFAULT 0, time_taken_ms integer)`,
  `CREATE TABLE IF NOT EXISTS session_answers (id text PRIMARY KEY NOT NULL, session_id text NOT NULL, question_id text NOT NULL, selected_option integer, is_correct integer, time_spent_ms integer)`,
  `CREATE TABLE IF NOT EXISTS guest_progress (guest_id text PRIMARY KEY NOT NULL, total_points integer DEFAULT 0, current_level integer DEFAULT 1, current_streak integer DEFAULT 0, longest_streak integer DEFAULT 0, badges text, total_sessions integer DEFAULT 0, total_correct integer DEFAULT 0, total_answered integer DEFAULT 0, last_practice_date text, updated_at text DEFAULT CURRENT_TIMESTAMP)`,
];

for (const stmt of stmts) {
  await client.execute(stmt);
  console.log('✓', stmt.slice(0,40));
}
client.close();
console.log('Migration done!');
