-- Align cover_letters with the 011 schema on databases that still carry 001 columns.
-- Makes job_description optional so upload/scratch/create flows do not fail on insert.

ALTER TABLE cover_letters
  ALTER COLUMN job_description DROP NOT NULL,
  ALTER COLUMN job_description SET DEFAULT '';

ALTER TABLE cover_letters
  ALTER COLUMN tone DROP NOT NULL;

ALTER TABLE cover_letters
  ALTER COLUMN length DROP NOT NULL;

ALTER TABLE cover_letters
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Cover Letter';

ALTER TABLE cover_letters
  ADD COLUMN IF NOT EXISTS company_name TEXT;

ALTER TABLE cover_letters
  ADD COLUMN IF NOT EXISTS job_title TEXT;
