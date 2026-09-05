-- Consolidated CareerPulse schema (self-hosted Postgres)
-- Source of truth for fresh database initialization

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

-- Interview Preparation module
DO $$ BEGIN
  CREATE TYPE interview_profile_status AS ENUM (
    'idle', 'analyzing', 'needs_clarification', 'ready', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS interview_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES cvs(id) ON DELETE SET NULL,
  status interview_profile_status NOT NULL DEFAULT 'idle',
  profession TEXT, occupation TEXT, role TEXT, domain TEXT, seniority TEXT,
  interview_stage TEXT, interview_date TIMESTAMPTZ,
  candidate_summary TEXT, job_summary TEXT,
  blueprint_json JSONB, gap_json JSONB, clarification_json JSONB, ai_metadata_json JSONB,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  source_job_hash TEXT, source_cv_hash TEXT, extra_context TEXT,
  job_analysis_json JSONB, candidate_analysis_json JSONB, mapped_context_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_chars INTEGER NOT NULL DEFAULT 0,
  output_chars INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  chars_per_token INTEGER NOT NULL DEFAULT 5,
  model TEXT,
  prompt_version TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_created_idx
  ON ai_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_events_user_category_idx
  ON ai_usage_events (user_id, category);

CREATE TABLE IF NOT EXISTS interview_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, category TEXT, description TEXT, importance TEXT, priority INTEGER,
  evidence_from_job TEXT, evidence_from_candidate TEXT, mastery_score INTEGER,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_preparation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  title TEXT, duration_days INTEGER, status TEXT NOT NULL DEFAULT 'active', plan_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_preparation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES interview_preparation_plans(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  name TEXT NOT NULL, description TEXT, priority INTEGER, estimated_minutes INTEGER,
  learning_objectives_json JSONB, mastery_score INTEGER, status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES interview_preparation_topics(id) ON DELETE SET NULL,
  title TEXT, difficulty TEXT, question_count INTEGER, metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES interview_quizzes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL, question_type TEXT NOT NULL, question_text TEXT NOT NULL,
  options_json JSONB, correct_answer_json JSONB, evaluation_rubric_json JSONB,
  explanation TEXT, competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT, metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS interview_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES interview_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER, answers_json JSONB, evaluation_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mock', mode TEXT NOT NULL DEFAULT 'practice', difficulty TEXT,
  status TEXT NOT NULL DEFAULT 'active', question_count INTEGER NOT NULL DEFAULT 0,
  target_question_count INTEGER, duration_minutes INTEGER,
  current_question_id UUID, draft_answer TEXT, overall_score INTEGER, evaluation_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL, question_type TEXT NOT NULL, question_text TEXT NOT NULL,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT, expected_points_json JSONB, evaluation_rubric_json JSONB,
  parent_question_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  text_answer TEXT, transcript TEXT, audio_path TEXT, duration_seconds INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES interview_answers(id) ON DELETE CASCADE,
  overall_score INTEGER, dimension_scores_json JSONB, strengths_json JSONB,
  weaknesses_json JSONB, missing_points_json JSONB, feedback TEXT,
  recommended_actions_json JSONB, ai_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES interview_competencies(id) ON DELETE CASCADE,
  mastery_score INTEGER NOT NULL DEFAULT 0, confidence INTEGER,
  evidence_count INTEGER NOT NULL DEFAULT 0, last_assessed_at TIMESTAMPTZ, trend TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (interview_profile_id, competency_id)
);

CREATE TABLE IF NOT EXISTS interview_prep_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL, sequence INTEGER NOT NULL,
  question_type TEXT NOT NULL, question_text TEXT NOT NULL,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT, answer_text TEXT NOT NULL, answer_source TEXT NOT NULL DEFAULT 'ai',
  relevance TEXT NOT NULL DEFAULT 'supported', evidence_from_cv TEXT, why_selected TEXT,
  ai_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_profiles_user ON interview_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_profile ON interview_prep_questions(interview_profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_profile_seq ON interview_prep_questions(interview_profile_id, sequence);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_profile ON interview_sessions(interview_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_interview_mastery_profile ON interview_mastery(interview_profile_id);

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
DROP TRIGGER IF EXISTS interview_profiles_updated_at ON interview_profiles;
CREATE TRIGGER interview_profiles_updated_at BEFORE UPDATE ON interview_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS interview_competencies_updated_at ON interview_competencies;
CREATE TRIGGER interview_competencies_updated_at BEFORE UPDATE ON interview_competencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS interview_prep_plans_updated_at ON interview_preparation_plans;
CREATE TRIGGER interview_prep_plans_updated_at BEFORE UPDATE ON interview_preparation_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS interview_prep_topics_updated_at ON interview_preparation_topics;
CREATE TRIGGER interview_prep_topics_updated_at BEFORE UPDATE ON interview_preparation_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS interview_mastery_updated_at ON interview_mastery;
CREATE TRIGGER interview_mastery_updated_at BEFORE UPDATE ON interview_mastery FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS interview_prep_questions_updated_at ON interview_prep_questions;
CREATE TRIGGER interview_prep_questions_updated_at BEFORE UPDATE ON interview_prep_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
