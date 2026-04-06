-- Phase 3 feature flags (disabled by default)
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('weekly_digest', 'التنبيه الأسبوعي', 'إيميل أسبوعي لولي الأمر كل أحد — ملخص أداء + نشاط منزلي مقترح', 0, ''),
  ('parent_dashboard_pro', 'لوحة والد متقدمة', 'لوحة والد متقدمة — رسوم بيانية شهرية + مقارنة أطفال + تحديد أهداف', 0, '');

-- Weekly digest log
CREATE TABLE IF NOT EXISTS digest_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  week_end TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  children_count INTEGER,
  UNIQUE(parent_id, week_start)
);

-- Digest unsubscribe
CREATE TABLE IF NOT EXISTS digest_unsubscribe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id TEXT NOT NULL UNIQUE,
  unsubscribed_at TEXT DEFAULT (datetime('now'))
);
