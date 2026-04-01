-- Add scalable `links` JSONB column for profile-level extra links.
-- Replaces the single portfolio_url / website_url fields conceptually;
-- old columns are kept for backward-compat but new data flows through `links`.
--
-- `projects` and `certifications` are already JSONB, so their per-item
-- `links` sub-field is a code-only change (no DDL needed).

ALTER TABLE cv_profiles
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]';

ALTER TABLE job_specific_cvs
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]';
