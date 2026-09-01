-- Consolidated CareerPulse schema (self-hosted Postgres)
-- Replaces Supabase auth.users + public tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'none', 'apply_later', 'applied', 'interviewing', 'technical_test',
    'offer_received', 'negotiating', 'offered', 'rejected', 'withdrawn',
    'ghosted', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  preferred_cl_template_id TEXT DEFAULT 'cl-classic',
  promo_code_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled CV',
  full_name TEXT,
  professional_title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  address TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  links JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  experience JSONB NOT NULL DEFAULT '[]',
  education JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  projects JSONB NOT NULL DEFAULT '[]',
  certifications JSONB NOT NULL DEFAULT '[]',
  languages JSONB NOT NULL DEFAULT '[]',
  awards JSONB NOT NULL DEFAULT '[]',
  referrals JSONB NOT NULL DEFAULT '[]',
  section_visibility JSONB NOT NULL DEFAULT '{}',
  cv_extra JSONB NOT NULL DEFAULT '{}',
  preferred_template_id TEXT DEFAULT 'classic',
  font_family TEXT DEFAULT 'Inter',
  accent_color TEXT DEFAULT '#6C63FF',
  job_ids UUID[] NOT NULL DEFAULT '{}',
  ai_changes_summary TEXT,
  keywords_added JSONB NOT NULL DEFAULT '[]',
  bullets_improved INTEGER DEFAULT 0,
  original_cv_file_url TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT NOT NULL DEFAULT 'USD',
  work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite')),
  status job_status NOT NULL DEFAULT 'none',
  keywords JSONB NOT NULL DEFAULT '[]',
  job_summary TEXT,
  saved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  offer_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_starred BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Cover Letter',
  company_name TEXT,
  job_title TEXT,
  job_description TEXT DEFAULT '',
  tone TEXT,
  length TEXT,
  specific_emphasis TEXT,
  content TEXT,
  ats_score INTEGER CHECK (ats_score BETWEEN 0 AND 100),
  ats_keywords_found JSONB NOT NULL DEFAULT '[]',
  ats_keywords_missing JSONB NOT NULL DEFAULT '[]',
  ats_summary TEXT,
  template_id TEXT DEFAULT 'cl-classic',
  pdf_url TEXT,
  docx_url TEXT,
  share_token TEXT UNIQUE,
  is_favourited BOOLEAN NOT NULL DEFAULT FALSE,
  generation_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  job_ids UUID[] NOT NULL DEFAULT '{}',
  applicant_name TEXT,
  applicant_role TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  applicant_location TEXT,
  source_type TEXT CHECK (source_type IN ('job_description', 'existing_cover_letter', 'scratch')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tran_id TEXT UNIQUE NOT NULL,
  val_id TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'refunded')),
  plan TEXT NOT NULL
    CHECK (plan IN ('pro_monthly','pro_yearly','premium_monthly','premium_yearly','career_monthly','career_yearly')),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cv_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cv', 'cover_letter')),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  category TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  available_tiers TEXT[] DEFAULT ARRAY['free','pro'],
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cvs_user_id_created_at ON cvs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvs_job_ids ON cvs USING GIN (job_ids);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cover_letters_job_ids ON cover_letters USING GIN (job_ids);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS cvs_updated_at ON cvs;
CREATE TRIGGER cvs_updated_at BEFORE UPDATE ON cvs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS cover_letters_updated_at ON cover_letters;
CREATE TRIGGER cover_letters_updated_at BEFORE UPDATE ON cover_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
