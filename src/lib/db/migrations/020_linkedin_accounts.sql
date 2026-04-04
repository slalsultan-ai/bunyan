-- Add account column to linkedin_posts (platform vs personal)
ALTER TABLE linkedin_posts ADD COLUMN account TEXT NOT NULL DEFAULT 'platform';
CREATE INDEX IF NOT EXISTS idx_linkedin_account_date ON linkedin_posts(account, generated_for_date);
