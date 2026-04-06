-- Phase 2 feature flags (disabled by default)
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled, allowed_emails) VALUES
  ('answer_explanations', 'شروحات تفاعلية', 'شروحات تفاعلية بعد كل سؤال — شرح الإجابة الصحيحة وسبب خطأ الإجابة الخاطئة', 0, ''),
  ('adaptive_path', 'المسار الذكي', 'مسار تدريب ذكي مخصص لكل طفل — يركّز على نقاط الضعف تلقائياً', 0, '');
