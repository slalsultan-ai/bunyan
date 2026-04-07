-- أكواد المؤسسات
CREATE TABLE IF NOT EXISTS institution_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  institution_type_other TEXT,
  max_users INTEGER NOT NULL DEFAULT 50,
  current_users INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ic_code ON institution_codes(code);
CREATE INDEX IF NOT EXISTS idx_ic_status ON institution_codes(status);

-- ربط المستخدمين بالأكواد
CREATE TABLE IF NOT EXISTS code_activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_id INTEGER NOT NULL,
  parent_id TEXT NOT NULL,
  child_id TEXT,
  activated_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (code_id) REFERENCES institution_codes(id),
  UNIQUE(code_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_ca_code ON code_activations(code_id);
CREATE INDEX IF NOT EXISTS idx_ca_parent ON code_activations(parent_id);

-- طلبات المنح
CREATE TABLE IF NOT EXISTS grant_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_number TEXT NOT NULL UNIQUE,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  institution_type_other TEXT,
  student_count INTEGER NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TEXT,
  generated_code TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gr_status ON grant_requests(status);
CREATE INDEX IF NOT EXISTS idx_gr_number ON grant_requests(request_number);

-- حالة الاشتراك للوالد (premium)
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  started_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  payment_method TEXT DEFAULT 'whatsapp',
  code_id INTEGER,
  notes TEXT,
  FOREIGN KEY (parent_id) REFERENCES parents(id)
);
CREATE INDEX IF NOT EXISTS idx_ps_parent ON premium_subscriptions(parent_id, status);
