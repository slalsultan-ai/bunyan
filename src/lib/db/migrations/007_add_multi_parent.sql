-- Multi-parent linking (shared children)
CREATE TABLE IF NOT EXISTS child_parents (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'follower',
  invite_token TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
