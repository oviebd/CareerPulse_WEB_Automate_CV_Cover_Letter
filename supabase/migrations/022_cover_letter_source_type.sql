-- Adds source_type to cover_letters to track how a letter was created.
-- Non-breaking: existing rows get NULL (= legacy / unknown).
ALTER TABLE cover_letters
  ADD COLUMN IF NOT EXISTS source_type TEXT
    CHECK (source_type IN ('job_description', 'existing_cover_letter', 'scratch'));
