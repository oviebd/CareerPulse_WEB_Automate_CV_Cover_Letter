-- Topic-based interview preparation: nullable job_id, prep_source, topic_config_json

-- Drop the old unique constraint on (user_id, job_id)
ALTER TABLE interview_profiles DROP CONSTRAINT IF EXISTS interview_profiles_user_id_job_id_key;
DROP INDEX IF EXISTS interview_profiles_user_job_uidx;

-- Allow topic-only profiles without a job
ALTER TABLE interview_profiles ALTER COLUMN job_id DROP NOT NULL;

-- Add prep source and topic config
ALTER TABLE interview_profiles ADD COLUMN IF NOT EXISTS prep_source TEXT NOT NULL DEFAULT 'job';
ALTER TABLE interview_profiles ADD COLUMN IF NOT EXISTS topic_config_json JSONB;

-- Partial unique index: one job prep per job per user (job rows only)
CREATE UNIQUE INDEX IF NOT EXISTS interview_profiles_user_job_uidx
  ON interview_profiles (user_id, job_id)
  WHERE job_id IS NOT NULL;

-- Ensure job rows have job_id; topic rows have config and no job_id
ALTER TABLE interview_profiles DROP CONSTRAINT IF EXISTS interview_profiles_source_check;
ALTER TABLE interview_profiles ADD CONSTRAINT interview_profiles_source_check CHECK (
  (prep_source = 'job' AND job_id IS NOT NULL)
  OR (prep_source = 'topic' AND job_id IS NULL AND topic_config_json IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS interview_profiles_prep_source_idx ON interview_profiles (prep_source);
