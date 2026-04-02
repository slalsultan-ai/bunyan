-- Feature flags system
CREATE TABLE IF NOT EXISTS feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 0,
  allowed_emails TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Initial feature flags
INSERT INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('child_pdf_report', 'تقرير PDF لولي الأمر', 'تحميل تقرير أداء الطفل كـ PDF', 0, 'sl.alsultan@gmail.com');

INSERT INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('review_mode', 'وضع المراجعة', 'مراجعة الأسئلة الخاطئة بترتيب ذكي', 0, 'sl.alsultan@gmail.com');
