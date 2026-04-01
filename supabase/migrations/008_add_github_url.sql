-- Add github_url column to cv_profiles and job_specific_cvs

ALTER TABLE cv_profiles ADD COLUMN IF NOT EXISTS github_url TEXT;

ALTER TABLE job_specific_cvs ADD COLUMN IF NOT EXISTS github_url TEXT;
