-- Mock tests: full GAT simulation exams

CREATE TABLE IF NOT EXISTS mock_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  age_group TEXT NOT NULL DEFAULT '10-12',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  total_questions INTEGER NOT NULL DEFAULT 30,
  question_ids TEXT NOT NULL,
  difficulty_mix TEXT NOT NULL DEFAULT '{"easy":10,"medium":12,"hard":8}',
  skill_mix TEXT NOT NULL DEFAULT '{"quantitative":10,"verbal":10,"logical":10}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mock_test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id TEXT NOT NULL,
  mock_test_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  time_spent_seconds INTEGER,
  status TEXT DEFAULT 'in_progress',
  answers TEXT NOT NULL DEFAULT '[]',
  score INTEGER,
  accuracy REAL,
  quantitative_score REAL,
  verbal_score REAL,
  logical_score REAL,
  percentile REAL,
  FOREIGN KEY (child_id) REFERENCES children(id),
  FOREIGN KEY (mock_test_id) REFERENCES mock_tests(id)
);

CREATE INDEX IF NOT EXISTS idx_mtr_child ON mock_test_results(child_id);
CREATE INDEX IF NOT EXISTS idx_mtr_test ON mock_test_results(mock_test_id);
CREATE INDEX IF NOT EXISTS idx_mtr_status ON mock_test_results(child_id, status);
