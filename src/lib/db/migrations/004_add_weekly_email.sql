-- Weekly email content and logging
CREATE TABLE IF NOT EXISTS weekly_email_content (
  id TEXT PRIMARY KEY NOT NULL,
  week_number INTEGER NOT NULL,
  age_group TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES parents(id),
  week_number INTEGER NOT NULL,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  resend_id TEXT
);
