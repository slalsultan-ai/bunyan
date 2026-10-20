-- Record which option the child chose, so every scored answer can be audited.
ALTER TABLE mastery_attempts ADD COLUMN selected_option INTEGER;
