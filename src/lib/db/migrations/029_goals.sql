-- Child goals for parent dashboard pro
CREATE TABLE IF NOT EXISTS child_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'accuracy', -- 'accuracy' | 'sessions' | 'streak'
  target_value REAL NOT NULL,
  current_value REAL,
  status TEXT DEFAULT 'active', -- 'active' | 'achieved' | 'abandoned'
  created_at TEXT DEFAULT (datetime('now')),
  achieved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_goals_child ON child_goals(child_id, status);
