-- Job-specific CVs: tailored snapshots of a user's CV for specific roles.

CREATE TABLE job_specific_cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Job context
  job_title TEXT NOT NULL,
  company_name TEXT,
  job_description TEXT NOT NULL,

  -- CV data snapshot (same structure as cv_profiles)
  full_name TEXT,
  professional_title TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  website_url TEXT,
  summary TEXT,
  experience JSONB NOT NULL DEFAULT '[]',
  education JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  projects JSONB NOT NULL DEFAULT '[]',
  certifications JSONB NOT NULL DEFAULT '[]',
  languages JSONB NOT NULL DEFAULT '[]',
  awards JSONB NOT NULL DEFAULT '[]',

  -- AI generation metadata
  ai_changes_summary TEXT,
  keywords_added JSONB DEFAULT '[]',
  bullets_improved INTEGER DEFAULT 0,

  -- Template preference
  preferred_template_id TEXT,
  accent_color TEXT DEFAULT '#6C63FF',

  -- Status
  is_archived BOOLEAN NOT NULL DEFAULT false,

  -- Optional link to a job application
  job_application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE job_specific_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their job_specific_cvs"
  ON job_specific_cvs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_job_specific_cvs_user_id ON job_specific_cvs(user_id, created_at DESC);
CREATE INDEX idx_job_specific_cvs_company ON job_specific_cvs(user_id, company_name);
CREATE INDEX idx_job_specific_cvs_archived ON job_specific_cvs(user_id, is_archived) WHERE is_archived = false;

CREATE TRIGGER job_specific_cvs_updated_at
  BEFORE UPDATE ON job_specific_cvs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
