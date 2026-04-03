-- Question mastery: retire questions after repeated correct answers
CREATE TABLE IF NOT EXISTS question_mastery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id TEXT,
  child_id TEXT,
  question_id TEXT NOT NULL,
  correct_count INTEGER DEFAULT 1,
  first_correct_at TEXT DEFAULT (datetime('now')),
  last_correct_at TEXT DEFAULT (datetime('now')),
  UNIQUE(guest_id, question_id),
  UNIQUE(child_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_qm_guest_correct ON question_mastery(guest_id, correct_count);
CREATE INDEX IF NOT EXISTS idx_qm_child_correct ON question_mastery(child_id, correct_count);

-- Feature flag
INSERT INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('question_retirement', 'اقصاء الاسئلة المتقنة', 'ايقاف ظهور الاسئلة اللي جاوب عليها الطفل صح 5 مرات', 0, 'sl.alsultan@gmail.com');
