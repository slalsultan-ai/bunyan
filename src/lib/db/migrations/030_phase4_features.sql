-- Phase 4: Feature flags for extended question bank + mock tests

-- بنك الأسئلة الموسّع
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled)
VALUES ('gat_extended_bank', 'بنك أسئلة GAT الموسّع', 'بنك أسئلة GAT الموسّع — 1,000+ سؤال من تجميعات حقيقية. المجاني يشوف الأساسية فقط.', 0);

-- اختبارات المحاكاة
INSERT OR IGNORE INTO feature_flags (flag_key, title, description, enabled)
VALUES ('mock_tests', 'اختبارات محاكاة GAT', 'اختبارات محاكاة GAT كاملة — 30 سؤال، 30 دقيقة، تقرير فوري. للفئة 10-12 فقط.', 0);
