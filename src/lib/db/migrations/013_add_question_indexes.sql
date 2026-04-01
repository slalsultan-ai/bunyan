-- Composite index for question selection queries
CREATE INDEX IF NOT EXISTS idx_questions_age_skill ON questions(age_group, skill_area, is_active);
