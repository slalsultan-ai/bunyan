-- Weekly challenges and progress tracking
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  week_start TEXT NOT NULL,
  goal_type TEXT NOT NULL,
  goal_target INTEGER NOT NULL,
  title_ar TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenge_progress (
  id TEXT PRIMARY KEY NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES weekly_challenges(id),
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
