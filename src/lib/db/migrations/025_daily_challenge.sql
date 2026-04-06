-- Daily challenges (one per date + age group)
CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date TEXT NOT NULL,
  age_group TEXT NOT NULL,
  question_ids TEXT NOT NULL, -- JSON array of question IDs
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dc_date_age ON daily_challenges(challenge_date, age_group);

-- Per-child results for each challenge question
CREATE TABLE IF NOT EXISTS daily_challenge_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  challenge_date TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT DEFAULT (datetime('now')),
  UNIQUE(child_id, challenge_date, question_id)
);
CREATE INDEX IF NOT EXISTS idx_dcr_child_date ON daily_challenge_results(child_id, challenge_date);

-- Streak tracking per child
CREATE TABLE IF NOT EXISTS daily_streaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_stars INTEGER DEFAULT 0,
  total_badges INTEGER DEFAULT 0,
  last_completed_date TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
