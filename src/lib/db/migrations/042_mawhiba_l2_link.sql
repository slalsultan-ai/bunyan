-- Mawhiba Level 2 track (age_group / track 'mawhiba_l2', questions imported by
-- src/lib/db/seed-mawhiba.ts --level 2). It is reachable only from the direct
-- link /practice/mawhiba, so the existing link flag now covers both tests.
UPDATE feature_flags
SET title = 'اختبارات موهبة — الرابط المباشر',
    description = 'يفتح /practice/mawhiba لكل من يملك الرابط، حتى بلا حساب: يختار الطالب اختبار موهبة ١ أو موهبة ٢ ثم يبدأ. الشريط في صفحة التمارين (موهبة ١ فقط) يبقى تحت علم mawhiba_l1.'
WHERE flag_key = 'mawhiba_l1_link';
