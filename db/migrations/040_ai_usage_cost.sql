-- Actual Anthropic billing fields on AI usage events

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usd_cost NUMERIC(12, 6) NOT NULL DEFAULT 0;
