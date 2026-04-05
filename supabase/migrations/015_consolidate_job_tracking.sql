-- Consolidate tracker state into `jobs.status` (job_status enum), drop `applied_jobs`.
-- Replaces legacy TEXT `jobs.status` kanban column + separate `applied_jobs` granular status.

DO $$
BEGIN
  CREATE TYPE job_status AS ENUM (
    'none',
    'apply_later',
    'applied',
    'interviewing',
    'technical_test',
    'offer_received',
    'negotiating',
    'offered',
    'rejected',
    'withdrawn',
    'ghosted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_jobs_status;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs RENAME COLUMN status TO job_status_legacy_text;

ALTER TABLE jobs ADD COLUMN status job_status NOT NULL DEFAULT 'none';

-- 1) applied_jobs is authoritative when present
UPDATE jobs j
SET status = CASE
  WHEN aj.status = 'saved' THEN 'none'::job_status
  WHEN aj.status = 'apply_later' THEN 'apply_later'::job_status
  WHEN aj.status = 'applied' THEN 'applied'::job_status
  WHEN aj.status = 'interviewing' THEN 'interviewing'::job_status
  WHEN aj.status = 'technical_test' THEN 'technical_test'::job_status
  WHEN aj.status = 'offer_received' THEN 'offer_received'::job_status
  WHEN aj.status = 'negotiating' THEN 'negotiating'::job_status
  WHEN aj.status = 'offered' THEN 'offered'::job_status
  WHEN aj.status = 'rejected' THEN 'rejected'::job_status
  WHEN aj.status = 'withdrawn' THEN 'withdrawn'::job_status
  WHEN aj.status = 'ghosted' THEN 'ghosted'::job_status
  ELSE 'none'::job_status
END
FROM applied_jobs aj
WHERE aj.job_id = j.id;

-- 2) Rows without applied_jobs: map legacy kanban TEXT only
UPDATE jobs j
SET status = CASE j.job_status_legacy_text
  WHEN 'saved' THEN 'none'::job_status
  WHEN 'applied' THEN 'applied'::job_status
  WHEN 'interviewing' THEN 'interviewing'::job_status
  WHEN 'offered' THEN 'offered'::job_status
  WHEN 'rejected' THEN 'rejected'::job_status
  WHEN 'withdrawn' THEN 'withdrawn'::job_status
  ELSE 'none'::job_status
END
WHERE NOT EXISTS (SELECT 1 FROM applied_jobs aj WHERE aj.job_id = j.id);

DROP TABLE IF EXISTS applied_jobs CASCADE;

ALTER TABLE jobs DROP COLUMN IF EXISTS job_status_legacy_text;

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(user_id, status);

-- Sanity: linked CVs / cover letters use job_ids UUID[] (no FK); optional post-migration checks:
-- SELECT COUNT(*) FROM cvs c WHERE cardinality(c.job_ids) > 0;
-- SELECT COUNT(*) FROM cover_letters cl WHERE cardinality(cl.job_ids) > 0;
