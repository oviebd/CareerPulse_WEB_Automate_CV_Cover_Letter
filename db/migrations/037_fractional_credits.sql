-- Store AI credits as fractional amounts (token-proportional billing).

ALTER TABLE credit_balances
  ALTER COLUMN balance TYPE NUMERIC(12, 4) USING balance::numeric(12, 4);

ALTER TABLE credit_transactions
  ALTER COLUMN amount TYPE NUMERIC(12, 4) USING amount::numeric(12, 4),
  ALTER COLUMN balance_before TYPE NUMERIC(12, 4) USING balance_before::numeric(12, 4),
  ALTER COLUMN balance_after TYPE NUMERIC(12, 4) USING balance_after::numeric(12, 4);

ALTER TABLE credit_rule_versions
  ALTER COLUMN input_token_credits TYPE NUMERIC(12, 4) USING input_token_credits::numeric(12, 4),
  ALTER COLUMN output_token_credits TYPE NUMERIC(12, 4) USING output_token_credits::numeric(12, 4);

ALTER TABLE ai_usage_events
  ALTER COLUMN credits_consumed TYPE NUMERIC(12, 4) USING credits_consumed::numeric(12, 4);
