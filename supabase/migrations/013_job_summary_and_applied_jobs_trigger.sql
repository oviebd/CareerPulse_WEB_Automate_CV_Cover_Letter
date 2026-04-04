-- job_summary: AI-generated structured summary for display and tracker context (not sent to generation prompts)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_summary TEXT;

-- Keep updated_at fresh on applied_jobs (function name matches 001_schema.sql)
DROP TRIGGER IF EXISTS applied_jobs_updated_at ON applied_jobs;
CREATE TRIGGER applied_jobs_updated_at
  BEFORE UPDATE ON applied_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
