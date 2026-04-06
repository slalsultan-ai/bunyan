-- Feature flags for new training features (disabled by default, admin enables)
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('spaced_repetition_v2', 'مراجعة ذكية 3/7/14 يوم', 'فترات مراجعة محسّنة: 3 ثم 7 ثم 14 يوم بدل 1/2/3', 0, 'sl.alsultan@gmail.com'),
  ('adaptive_difficulty', 'صعوبة تكيفية', 'اختيار صعوبة الأسئلة تلقائياً بناءً على آخر 10 إجابات', 0, 'sl.alsultan@gmail.com'),
  ('sub_skill_filter', 'فلتر المهارة الفرعية', 'تصفية الأسئلة حسب المهارة الفرعية (sub_skill)', 0, 'sl.alsultan@gmail.com'),
  ('quick_weakness', 'جلسة 3 دقائق مخصّصة', 'بطاقة جلسة سريعة لتحسين أضعف مهارة فرعية', 0, 'sl.alsultan@gmail.com');
