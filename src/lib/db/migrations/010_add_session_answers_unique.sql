-- Prevent duplicate answers for same question in same session
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_session_question ON session_answers(session_id, question_id);
