-- Adaptive mastery engine (BKT + mastery gates). Additive only.

-- Per child × unified skill: BKT estimate and mastery-cycle status
CREATE TABLE IF NOT EXISTS mastery_skill_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  p_known REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'learning', -- learning | testing | mastered | deferred
  observations INTEGER NOT NULL DEFAULT 0,
  attempts_in_status INTEGER NOT NULL DEFAULT 0,
  practice_since_test INTEGER NOT NULL DEFAULT 0,
  test_question_ids TEXT, -- JSON array while status = testing
  test_results TEXT, -- JSON array of booleans while status = testing
  review_stage INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT,
  review_wrongs INTEGER NOT NULL DEFAULT 0,
  deferred_reason TEXT,
  remediation_for TEXT, -- skill key this skill was reopened to support
  mastered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(child_id, skill_key)
);
CREATE INDEX IF NOT EXISTS idx_mss_child ON mastery_skill_state(child_id);

-- One practice run of up to N questions, served one at a time
CREATE TABLE IF NOT EXISTS mastery_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  served INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  reviews_served INTEGER NOT NULL DEFAULT 0,
  diagnostics_served INTEGER NOT NULL DEFAULT 0,
  current_question_id TEXT,
  current_skill_key TEXT,
  current_purpose TEXT, -- practice | diagnostic | test | review
  current_reason TEXT, -- JSON: why this question was chosen
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_msess_child ON mastery_sessions(child_id, completed_at);

-- Every answer with the model state before/after and the rule that fired
CREATE TABLE IF NOT EXISTS mastery_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  session_id INTEGER,
  question_id TEXT NOT NULL,
  skill_key TEXT NOT NULL,
  purpose TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  p_before REAL NOT NULL,
  p_after REAL NOT NULL,
  status_before TEXT NOT NULL,
  status_after TEXT NOT NULL,
  selection_reason TEXT, -- JSON
  decisions TEXT, -- JSON array of fired rules
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_matt_child ON mastery_attempts(child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_matt_child_q ON mastery_attempts(child_id, question_id);

-- Optional calibrated BKT parameters per skill (defaults live in code)
CREATE TABLE IF NOT EXISTS mastery_bkt_params (
  skill_key TEXT PRIMARY KEY,
  p_init REAL NOT NULL,
  p_transit REAL NOT NULL,
  p_slip REAL NOT NULL,
  p_guess REAL NOT NULL,
  sample_size INTEGER,
  fitted_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, activation_mode, allowed_emails) VALUES
  ('adaptive_mastery', 'التكيّف والإتقان', 'محرك BKT وبوابات الإتقان في المسار الذكي (6-9)', 0, 'allowed_only', 'sl.alsultan@gmail.com');
