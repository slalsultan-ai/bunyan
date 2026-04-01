-- Additional email preference columns on parents
ALTER TABLE parents ADD COLUMN achievement_email_enabled INTEGER DEFAULT 1;
ALTER TABLE parents ADD COLUMN monthly_report_enabled INTEGER DEFAULT 1;
