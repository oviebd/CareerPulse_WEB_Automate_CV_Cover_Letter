-- Pause/resume timer support for mock interview sessions
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;

-- Backfill timer for active sessions so existing in-progress interviews keep timing
UPDATE interview_sessions
SET timer_started_at = started_at
WHERE status = 'active' AND timer_started_at IS NULL;
