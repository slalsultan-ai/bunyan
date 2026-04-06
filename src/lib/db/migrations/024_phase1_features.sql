-- Phase 1 feature flags (disabled by default)
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('daily_challenge', 'التحدي اليومي', 'التحدي اليومي — 3 أسئلة يومية مع نجمات وأوسمة', 0, ''),
  ('session_limit', 'سقف الجلسات', 'سقف 3 جلسات يومية للمجاني — غير محدود للمدفوع', 0, '');

-- Mark daily challenge sessions so they don't count toward session limit
ALTER TABLE sessions ADD COLUMN is_daily_challenge INTEGER DEFAULT 0;

-- Premium waitlist
CREATE TABLE IF NOT EXISTS premium_waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);
