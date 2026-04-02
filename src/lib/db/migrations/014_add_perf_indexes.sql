-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty   ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_rl_key_window          ON rate_limits(key, window_start);
CREATE INDEX IF NOT EXISTS idx_el_type_sent           ON email_log(email_type, sent_at);
CREATE INDEX IF NOT EXISTS idx_sessions_guest_date    ON sessions(guest_id, started_at);
