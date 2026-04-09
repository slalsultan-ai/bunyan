-- Add activation_mode column to feature_flags
-- Values: 'allowed_only' (default), 'premium', 'everyone'
-- Replaces the binary enabled (0/1) column

ALTER TABLE feature_flags ADD COLUMN activation_mode TEXT NOT NULL DEFAULT 'allowed_only';

-- Migrate existing data: enabled=1 → 'premium', enabled=0 → 'allowed_only'
-- session_limit was special (enforcement flag): enabled=1 meant everyone
UPDATE feature_flags SET activation_mode = 'premium' WHERE enabled = 1 AND flag_key != 'session_limit';
UPDATE feature_flags SET activation_mode = 'everyone' WHERE enabled = 1 AND flag_key = 'session_limit';
