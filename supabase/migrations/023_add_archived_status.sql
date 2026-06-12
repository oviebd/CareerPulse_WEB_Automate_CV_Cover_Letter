-- Adds 'archived' to the job_status enum so jobs can be moved to an Archived column.
-- Non-breaking: existing rows are unaffected; ADD VALUE is safe (no table rewrite, no lock).
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'archived' AFTER 'ghosted';
