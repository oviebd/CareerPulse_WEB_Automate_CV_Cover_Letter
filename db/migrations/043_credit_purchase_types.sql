-- Allow Paddle pack purchases and Pro safety grants on the credit ledger.
-- credit_purchase / subscription_grant were used in app code but missing from the CHECK.

ALTER TABLE credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'credit_transactions'
      AND con.contype = 'c'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%type IN%'
        OR pg_get_constraintdef(con.oid) ILIKE '%type = ANY%'
      )
  LOOP
    EXECUTE format('ALTER TABLE credit_transactions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'initial_grant',
    'admin_grant',
    'admin_adjust',
    'promo_grant',
    'subscription_grant',
    'credit_purchase',
    'reservation',
    'reservation_release',
    'ai_usage',
    'refund'
  ));
