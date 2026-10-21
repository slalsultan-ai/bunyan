-- Mawhiba Level 1: open the track to anyone who has the direct link
-- (/practice/mawhiba), separately from `mawhiba_l1`, which still controls
-- the banner on the practice page. Set to allowed_only to close the link again.
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, activation_mode, allowed_emails) VALUES
  ('mawhiba_l1_link', 'مسار موهبة ١ — الرابط المباشر', 'يفتح مسار موهبة ١ لكل من يملك الرابط المباشر /practice/mawhiba (طفل مسجّل من 6 إلى 11 سنة). الشريط في صفحة التمارين يبقى تحت علم mawhiba_l1.', 1, 'everyone', '');
