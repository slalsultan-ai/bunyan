-- Performance indexes for frequently queried columns

-- Questions: filtered by isActive, ageGroup, skillArea in every practice query
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_age_group ON questions(age_group);
CREATE INDEX IF NOT EXISTS idx_questions_skill_area ON questions(skill_area);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Sessions: filtered by childId, guestId, completedAt in dashboard/progress queries
CREATE INDEX IF NOT EXISTS idx_sessions_child_id ON sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_sessions_guest_id ON sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_parent_id ON sessions(parent_id);

-- Session answers: joined with sessions and questions in skill breakdown queries
CREATE INDEX IF NOT EXISTS idx_session_answers_session_id ON session_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_answers_question_id ON session_answers(question_id);

-- Children: parent dashboard fetches children by parentId
CREATE INDEX IF NOT EXISTS idx_children_parent_id ON children(parent_id);

-- Child-parents (multi-parent linking): lookups by parentId and childId
CREATE INDEX IF NOT EXISTS idx_child_parents_parent_id ON child_parents(parent_id);
CREATE INDEX IF NOT EXISTS idx_child_parents_child_id ON child_parents(child_id);

-- Email log: checked during session completion and cron jobs
CREATE INDEX IF NOT EXISTS idx_email_log_parent_id ON email_log(parent_id);

-- OTP codes: looked up by email during verification
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);

-- Review queue: queried by guestId/childId with mastered filter
CREATE INDEX IF NOT EXISTS idx_review_queue_guest_id ON review_queue(guest_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_child_id ON review_queue(child_id);
CREATE INDEX IF NOT EXISTS idx_review_queue_mastered ON review_queue(mastered);

-- Rate limits: looked up by key
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
