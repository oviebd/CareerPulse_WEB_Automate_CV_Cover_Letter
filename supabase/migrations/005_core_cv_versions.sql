-- Multiple core CV versions per user
-- Previously `cv_profiles` had UNIQUE(user_id) which prevented storing multiple uploads.

-- 1) Remove the unique constraint on user_id
-- (constraint name commonly defaults to cv_profiles_user_id_key)
ALTER TABLE cv_profiles
  DROP CONSTRAINT IF EXISTS cv_profiles_user_id_key;

-- Some Supabase setups create an index with the same default name.
DROP INDEX IF EXISTS cv_profiles_user_id_key;

-- 2) Index for sorting core CV versions by most recent
CREATE INDEX IF NOT EXISTS idx_cv_profiles_user_id_created_at
  ON cv_profiles(user_id, created_at DESC);

