-- Adaptive path sessions
CREATE TABLE IF NOT EXISTS adaptive_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  session_number INTEGER NOT NULL,
  focus_areas TEXT NOT NULL, -- JSON array of sub-skill names
  question_ids TEXT NOT NULL, -- JSON array of question IDs
  completed INTEGER DEFAULT 0,
  accuracy REAL,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_as_child ON adaptive_sessions(child_id);

-- Skill snapshots (recalculated every 3 sessions)
CREATE TABLE IF NOT EXISTS skill_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  skills_data TEXT NOT NULL, -- JSON: [{ subSkill, accuracy, trend }, ...]
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ss_child_date ON skill_snapshots(child_id, snapshot_date);
