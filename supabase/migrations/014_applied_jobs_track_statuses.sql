-- Expand applied_jobs.status for granular tracker statuses (job row keeps canonical board columns separately).

ALTER TABLE applied_jobs DROP CONSTRAINT IF EXISTS applied_jobs_status_check;

ALTER TABLE applied_jobs ADD CONSTRAINT applied_jobs_status_check CHECK (
  status IN (
    'apply_later',
    'applied',
    'interviewing',
    'technical_test',
    'offer_received',
    'negotiating',
    'rejected',
    'withdrawn',
    'ghosted',
    'saved',
    'offered'
  )
);
