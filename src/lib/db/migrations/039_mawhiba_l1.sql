-- Mawhiba Level 1 adaptive-mastery track. Additive only.
-- Questions are imported separately (src/lib/db/seed-mawhiba-l1.ts) under age_group = 'mawhiba_l1'.

-- Sessions belong to one track so an open 6-9 session never mixes with Mawhiba.
ALTER TABLE mastery_sessions ADD COLUMN track TEXT NOT NULL DEFAULT '6-9';
CREATE INDEX IF NOT EXISTS idx_msess_child_track ON mastery_sessions(child_id, track, completed_at);

INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, activation_mode, allowed_emails) VALUES
  ('mawhiba_l1', 'مسار موهبة ١', 'مسار تدريب تكيّفي بالإتقان على نمط مقياس موهبة المستوى الأول (607 أسئلة)', 0, 'allowed_only', 'sl.alsultan@gmail.com');
