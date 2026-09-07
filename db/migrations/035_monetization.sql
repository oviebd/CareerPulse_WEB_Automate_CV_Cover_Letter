-- Monetization: roles, plans, credit ledger, promo codes, credit rules

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'super_admin'));

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_balances (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_token_unit INTEGER NOT NULL DEFAULT 1000 CHECK (input_token_unit > 0),
  input_token_credits INTEGER NOT NULL DEFAULT 1 CHECK (input_token_credits >= 0),
  output_token_unit INTEGER NOT NULL DEFAULT 1000 CHECK (output_token_unit > 0),
  output_token_credits INTEGER NOT NULL DEFAULT 5 CHECK (output_token_credits >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'initial_grant', 'admin_grant', 'admin_adjust', 'promo_grant',
    'reservation', 'reservation_release', 'ai_usage', 'refund'
  )),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source TEXT,
  reference_id UUID,
  ai_usage_id UUID,
  description TEXT,
  rule_snapshot JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  grants_plan TEXT,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_usage_events
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'anthropic',
  ADD COLUMN IF NOT EXISTS feature TEXT,
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS credits_consumed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_rule_version UUID REFERENCES credit_rule_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_source TEXT NOT NULL DEFAULT 'api' CHECK (token_source IN ('api', 'estimated')),
  ADD COLUMN IF NOT EXISTS cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS credit_transactions_user_created_idx
  ON credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS credit_transactions_type_idx
  ON credit_transactions (type);

CREATE INDEX IF NOT EXISTS credit_transactions_ai_usage_idx
  ON credit_transactions (ai_usage_id)
  WHERE ai_usage_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_usage_events_feature_created_idx
  ON ai_usage_events (feature, created_at DESC)
  WHERE feature IS NOT NULL;

CREATE INDEX IF NOT EXISTS credit_rule_versions_active_idx
  ON credit_rule_versions (is_active)
  WHERE is_active = true;

-- Seed plans
INSERT INTO plans (slug, name, description, is_active)
VALUES
  ('free', 'Free', 'CV builder, interview prep, and AI credits', true),
  ('pro', 'Premium', 'Premium templates, DOCX export, and ATS auto-fix', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Seed default credit rule (only if none active)
INSERT INTO credit_rule_versions (
  input_token_unit, input_token_credits, output_token_unit, output_token_credits, is_active
)
SELECT 1000, 1, 1000, 5, true
WHERE NOT EXISTS (SELECT 1 FROM credit_rule_versions WHERE is_active = true);

-- Seed system settings
INSERT INTO system_settings (key, value)
VALUES
  ('initial_free_credits', '150'::jsonb),
  ('minimum_credit_balance', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Seed legacy promo code
INSERT INTO promo_codes (code, is_active, max_redemptions, grants_plan, bonus_credits)
VALUES ('2468', true, NULL, 'pro', 0)
ON CONFLICT (code) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  grants_plan = EXCLUDED.grants_plan;

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS promo_codes_updated_at ON promo_codes;
CREATE TRIGGER promo_codes_updated_at BEFORE UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS credit_balances_updated_at ON credit_balances;
CREATE TRIGGER credit_balances_updated_at BEFORE UPDATE ON credit_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
