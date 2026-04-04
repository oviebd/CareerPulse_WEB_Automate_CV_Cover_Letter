-- Migration 012: applied_jobs tracker join, keywords on jobs, remove full job description from jobs

-- ---------------------------------------------------------------------------
-- jobs: store keyword list only (no full JD text)
-- ---------------------------------------------------------------------------
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS keywords JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE jobs
  DROP COLUMN IF EXISTS job_description;

-- ---------------------------------------------------------------------------
-- applied_jobs: user ↔ job tracking (which jobs appear in the tracker board)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applied_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'saved'
              CHECK (status IN ('saved','applied','interviewing','offered','rejected','withdrawn')),
  notes       TEXT,
  applied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applied_jobs_user_id ON applied_jobs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_applied_jobs_job_id ON applied_jobs(job_id);

-- Backfill: existing jobs should remain visible in the tracker
INSERT INTO applied_jobs (user_id, job_id, status, notes, applied_at, created_at, updated_at)
SELECT user_id, id, status, notes, applied_at, created_at, updated_at
FROM jobs
ON CONFLICT (user_id, job_id) DO NOTHING;

ALTER TABLE applied_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applied_jobs"
  ON applied_jobs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
