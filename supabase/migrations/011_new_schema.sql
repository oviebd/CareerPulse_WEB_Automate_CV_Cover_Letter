-- Migration 011: New CV, Jobs, Cover Letter schema
-- Replaces cv_profiles, job_specific_cvs, job_applications, cover_letters
--
-- NOTE: Old tables may have been dropped via Supabase dashboard before this migration.
-- This file documents the replacement schema for reproducibility.
-- Do not run blindly on a database that already has these objects unless you intend to recreate them.

-- ---------------------------------------------------------------------------
-- Optional: default cover letter template preference (not on `cvs` rows)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_cl_template_id TEXT DEFAULT 'cl-classic';

-- ---------------------------------------------------------------------------
-- TABLE: cvs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cvs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'Untitled CV',
  full_name             TEXT,
  professional_title    TEXT,
  email                 TEXT,
  phone                 TEXT,
  location              TEXT,
  address               TEXT,
  photo_url             TEXT,
  linkedin_url          TEXT,
  github_url            TEXT,
  links                 JSONB NOT NULL DEFAULT '[]',
  summary               TEXT,
  experience            JSONB NOT NULL DEFAULT '[]',
  education             JSONB NOT NULL DEFAULT '[]',
  skills                JSONB NOT NULL DEFAULT '[]',
  projects              JSONB NOT NULL DEFAULT '[]',
  certifications        JSONB NOT NULL DEFAULT '[]',
  languages             JSONB NOT NULL DEFAULT '[]',
  awards                JSONB NOT NULL DEFAULT '[]',
  referrals             JSONB NOT NULL DEFAULT '[]',
  section_visibility    JSONB NOT NULL DEFAULT '{}',
  preferred_template_id TEXT DEFAULT 'classic',
  font_family           TEXT DEFAULT 'Inter',
  accent_color          TEXT DEFAULT '#6C63FF',
  job_ids               UUID[] NOT NULL DEFAULT '{}',
  ai_changes_summary    TEXT,
  keywords_added        JSONB NOT NULL DEFAULT '[]',
  bullets_improved      INTEGER DEFAULT 0,
  original_cv_file_url  TEXT,
  is_complete           BOOLEAN NOT NULL DEFAULT FALSE,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If `cvs` already existed (CREATE TABLE was skipped), ensure columns added in 011 exist.
ALTER TABLE cvs ADD COLUMN IF NOT EXISTS job_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_cvs_user_id_created_at ON cvs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvs_job_ids ON cvs USING GIN (job_ids);

-- ---------------------------------------------------------------------------
-- TABLE: jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name      TEXT NOT NULL,
  job_title         TEXT NOT NULL,
  job_url           TEXT,
  job_description   TEXT,
  location          TEXT,
  salary_min        INTEGER,
  salary_max        INTEGER,
  salary_currency   TEXT NOT NULL DEFAULT 'USD',
  work_type         TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite')),
  status            TEXT NOT NULL DEFAULT 'saved'
                    CHECK (status IN ('saved','applied','interviewing','offered','rejected','withdrawn')),
  saved_at          TIMESTAMPTZ,
  applied_at        TIMESTAMPTZ,
  interview_at      TIMESTAMPTZ,
  offer_at          TIMESTAMPTZ,
  deadline          TIMESTAMPTZ,
  notes             TEXT,
  contact_name      TEXT,
  contact_email     TEXT,
  priority          TEXT NOT NULL DEFAULT 'medium',
  is_starred        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(user_id, status);

-- ---------------------------------------------------------------------------
-- TABLE: cover_letters
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cover_letters (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL DEFAULT 'Untitled Cover Letter',
  tone                  TEXT,
  length                TEXT,
  specific_emphasis     TEXT,
  content               TEXT,
  ats_score             INTEGER CHECK (ats_score BETWEEN 0 AND 100),
  ats_keywords_found    JSONB NOT NULL DEFAULT '[]',
  ats_keywords_missing  JSONB NOT NULL DEFAULT '[]',
  ats_summary           TEXT,
  template_id           TEXT DEFAULT 'cl-classic',
  pdf_url               TEXT,
  docx_url              TEXT,
  share_token           TEXT UNIQUE,
  is_favourited         BOOLEAN NOT NULL DEFAULT FALSE,
  generation_model      TEXT,
  input_tokens          INTEGER,
  output_tokens         INTEGER,
  job_ids               UUID[] NOT NULL DEFAULT '{}',
  applicant_name        TEXT,
  applicant_role        TEXT,
  applicant_email       TEXT,
  applicant_phone       TEXT,
  applicant_location    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If `cover_letters` already existed (CREATE TABLE was skipped), ensure `job_ids` exists.
ALTER TABLE cover_letters ADD COLUMN IF NOT EXISTS job_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cover_letters_job_ids ON cover_letters USING GIN (job_ids);
