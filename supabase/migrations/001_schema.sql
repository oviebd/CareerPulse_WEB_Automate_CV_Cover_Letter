-- Run in Supabase SQL Editor in order (Phase 1). Do not alter column names or types.

-- ============================================================
-- TABLE 1: profiles (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'premium', 'career')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
  subscription_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  is_onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

-- ============================================================
-- TABLE 2: cv_profiles (one per user — master career data)
-- ============================================================
CREATE TABLE cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT,
  professional_title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  website_url TEXT,
  summary TEXT,
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  projects JSONB DEFAULT '[]',
  certifications JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  awards JSONB DEFAULT '[]',
  is_complete BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  original_cv_file_url TEXT,
  preferred_cv_template_id TEXT DEFAULT 'classic',
  preferred_cl_template_id TEXT DEFAULT 'cl-classic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================
-- TABLE 3: cover_letters
-- ============================================================
CREATE TABLE cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_title TEXT,
  company_name TEXT,
  job_description TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'professional'
    CHECK (tone IN ('professional', 'confident', 'creative', 'concise', 'formal')),
  length TEXT NOT NULL DEFAULT 'medium'
    CHECK (length IN ('short', 'medium', 'long')),
  specific_emphasis TEXT,
  content TEXT NOT NULL,
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  ats_keywords_found JSONB DEFAULT '[]',
  ats_keywords_missing JSONB DEFAULT '[]',
  ats_summary TEXT,
  template_id TEXT DEFAULT 'cl-classic',
  pdf_url TEXT,
  docx_url TEXT,
  share_token TEXT UNIQUE,
  is_favourited BOOLEAN NOT NULL DEFAULT false,
  generation_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  job_application_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: job_applications (Kanban tracker)
-- ============================================================
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  work_type TEXT CHECK (work_type IN ('remote', 'hybrid', 'onsite')),
  status TEXT NOT NULL DEFAULT 'saved'
    CHECK (status IN ('saved', 'applied', 'phone_screen', 'interview',
                      'technical', 'final_round', 'offer', 'rejected', 'withdrawn')),
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  offer_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cover_letters
  ADD CONSTRAINT cover_letters_job_application_id_fkey
  FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 5: payments
-- ============================================================
CREATE TABLE payments (
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

-- ============================================================
-- TABLE 6: cv_templates (static seed data)
-- ============================================================
CREATE TABLE cv_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('cv', 'cover_letter')),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  category TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  available_tiers TEXT[] DEFAULT ARRAY['free','pro','premium','career'],
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their cv_profile" ON cv_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their cover_letters" ON cover_letters FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public cover letter via share token" ON cover_letters FOR SELECT USING (share_token IS NOT NULL);
CREATE POLICY "Users own their job_applications" ON job_applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Templates are publicly readable" ON cv_templates FOR SELECT USING (true);

CREATE INDEX idx_cv_profiles_user_id ON cv_profiles(user_id);
CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_created_at ON cover_letters(user_id, created_at DESC);
CREATE INDEX idx_cover_letters_job_app ON cover_letters(job_application_id);
CREATE INDEX idx_cover_letters_share_token ON cover_letters(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(user_id, status);
CREATE INDEX idx_payments_user_id ON payments(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_payments_tran_id ON payments(tran_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cv_profiles_updated_at BEFORE UPDATE ON cv_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cover_letters_updated_at BEFORE UPDATE ON cover_letters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order) VALUES
('classic',     'cv',           'Classic',          'Clean single-column layout',         'professional', false, ARRAY['free','pro','premium','career'], 1),
('minimal',     'cv',           'Minimal',           'Ultra-sparse, lots of whitespace',   'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('sidebar',     'cv',           'Sidebar',           'Left sidebar + main column',         'professional', true,  ARRAY['pro','premium','career'],        3),
('bold-header', 'cv',           'Bold Header',       'Full-width color header band',       'creative',     true,  ARRAY['pro','premium','career'],        4),
('two-column',  'cv',           'Two Column',        'Equal-width symmetric layout',       'professional', true,  ARRAY['pro','premium','career'],        5),
('executive',   'cv',           'Executive',         'Dense, formal, text-heavy',          'executive',    true,  ARRAY['premium','career'],              6),
('cl-classic',  'cover_letter', 'Classic',           'Traditional letter format',          'professional', false, ARRAY['free','pro','premium','career'], 1),
('cl-modern',   'cover_letter', 'Modern Block',      'Clean modern, no indents',           'minimal',      false, ARRAY['free','pro','premium','career'], 2),
('cl-minimal',  'cover_letter', 'Minimal',           'Ultra-sparse cover letter',          'minimal',      true,  ARRAY['pro','premium','career'],        3),
('cl-formal',   'cover_letter', 'Formal Letterhead', 'Company letterhead style',           'executive',    true,  ARRAY['pro','premium','career'],        4),
('cl-creative', 'cover_letter', 'Creative Header',   'Bold name header, visual accent',    'creative',     true,  ARRAY['premium','career'],              5);
