-- Interview mapped context columns + AI usage ledger

ALTER TABLE interview_profiles
  ADD COLUMN IF NOT EXISTS job_analysis_json JSONB,
  ADD COLUMN IF NOT EXISTS candidate_analysis_json JSONB,
  ADD COLUMN IF NOT EXISTS mapped_context_json JSONB;

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_chars INTEGER NOT NULL DEFAULT 0,
  output_chars INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  chars_per_token INTEGER NOT NULL DEFAULT 5,
  model TEXT,
  prompt_version TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON ai_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_category_idx
  ON ai_usage_events (user_id, category);
