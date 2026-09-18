-- Backfill usd_cost for rows recorded before cost was persisted (matches lib/ai/anthropic-pricing.ts)

UPDATE ai_usage_events
SET usd_cost = ROUND(
  (
    (GREATEST(input_tokens, 0)::numeric / 1000000) *
      CASE
        WHEN lower(coalesce(model, '')) LIKE '%sonnet%' OR lower(coalesce(model, '')) LIKE '%opus%' THEN 3
        ELSE 1
      END
    + (GREATEST(output_tokens, 0)::numeric / 1000000) *
      CASE
        WHEN lower(coalesce(model, '')) LIKE '%sonnet%' OR lower(coalesce(model, '')) LIKE '%opus%' THEN 15
        ELSE 5
      END
    + (GREATEST(cache_creation_input_tokens, 0)::numeric / 1000000) *
      CASE
        WHEN lower(coalesce(model, '')) LIKE '%sonnet%' OR lower(coalesce(model, '')) LIKE '%opus%' THEN 3.75
        ELSE 1.25
      END
    + (GREATEST(cached_input_tokens, 0)::numeric / 1000000) *
      CASE
        WHEN lower(coalesce(model, '')) LIKE '%sonnet%' OR lower(coalesce(model, '')) LIKE '%opus%' THEN 0.3
        ELSE 0.1
      END
  )::numeric,
  6
)
WHERE usd_cost = 0
  AND (input_tokens > 0 OR output_tokens > 0);
