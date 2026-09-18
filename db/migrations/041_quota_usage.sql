-- User-facing action quotas (tailored CV, cover letter, interview, rewrite)

CREATE TABLE IF NOT EXISTS quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  bonus INTEGER NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, metric, period_key)
);

CREATE INDEX IF NOT EXISTS quota_usage_user_metric_idx
  ON quota_usage (user_id, metric, period_key);
