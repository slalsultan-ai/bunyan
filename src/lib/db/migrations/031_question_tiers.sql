-- Question tiers: free vs premium classification

-- تصنيف الأسئلة: مجاني أو مدفوع
ALTER TABLE questions ADD COLUMN tier TEXT DEFAULT 'free';

-- مصدر السؤال
ALTER TABLE questions ADD COLUMN source TEXT DEFAULT 'original';

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_questions_tier ON questions(tier);
CREATE INDEX IF NOT EXISTS idx_questions_source ON questions(source);
CREATE INDEX IF NOT EXISTS idx_questions_tier_age ON questions(tier, age_group);

-- كل الأسئلة الحالية تبقى مجانية
UPDATE questions SET tier = 'free', source = 'original' WHERE tier IS NULL OR tier = '';
