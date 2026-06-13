-- Track which promo code a user has redeemed (null = none used)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS promo_code_used TEXT DEFAULT NULL;
