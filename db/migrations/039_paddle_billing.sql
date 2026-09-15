-- Paddle Billing: subscription mapping + webhook idempotency

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing', 'paused'));

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT UNIQUE,
  paddle_transaction_id TEXT,
  paddle_price_id TEXT,
  plan TEXT CHECK (plan IS NULL OR plan IN ('pro_monthly', 'pro_yearly')),
  status TEXT NOT NULL DEFAULT 'inactive',
  billing_interval TEXT CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  scheduled_change JSONB,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_event_id TEXT,
  last_event_occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_paddle_customer_idx
  ON subscriptions (paddle_customer_id);

CREATE TABLE IF NOT EXISTS paddle_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processed', 'ignored', 'failed')),
  payload_hash TEXT,
  occurred_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
