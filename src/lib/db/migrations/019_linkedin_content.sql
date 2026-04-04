-- LinkedIn content posts table
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_type TEXT NOT NULL,
  content TEXT NOT NULL,
  comment TEXT,
  question_id TEXT,
  copied INTEGER DEFAULT 0,
  generated_for_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_linkedin_date ON linkedin_posts(generated_for_date);
CREATE INDEX IF NOT EXISTS idx_linkedin_type_date ON linkedin_posts(post_type, generated_for_date);
