-- Add parent/child/IP tracking columns to sessions table
ALTER TABLE sessions ADD COLUMN parent_id TEXT;
ALTER TABLE sessions ADD COLUMN child_id TEXT;
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
