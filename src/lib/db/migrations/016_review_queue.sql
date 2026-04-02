-- Review queue for spaced repetition
CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id TEXT,
  child_id TEXT,
  question_id TEXT NOT NULL,
  times_wrong INTEGER DEFAULT 1,
  times_reviewed INTEGER DEFAULT 0,
  last_wrong_at TEXT NOT NULL,
  next_review_at TEXT NOT NULL,
  mastered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(guest_id, question_id),
  UNIQUE(child_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_review_queue_guest ON review_queue(guest_id, mastered, next_review_at);

CREATE INDEX IF NOT EXISTS idx_review_queue_child ON review_queue(child_id, mastered, next_review_at);
