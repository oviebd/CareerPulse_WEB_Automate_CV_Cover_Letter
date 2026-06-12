-- Consolidate premium/career into pro; restrict tier CHECK to free | pro

UPDATE profiles
SET subscription_tier = 'pro'
WHERE subscription_tier IN ('premium', 'career');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'pro'));
