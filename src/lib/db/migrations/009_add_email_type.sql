-- Add email_type column to email_log for distinguishing weekly vs achievement emails
ALTER TABLE email_log ADD COLUMN email_type TEXT DEFAULT 'weekly';
