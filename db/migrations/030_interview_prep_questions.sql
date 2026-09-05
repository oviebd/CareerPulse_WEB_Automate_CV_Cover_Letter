-- Likely interview questions for prepare-page study Q&A

CREATE TABLE IF NOT EXISTS interview_prep_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT,
  answer_text TEXT NOT NULL,
  answer_source TEXT NOT NULL DEFAULT 'ai',
  relevance TEXT NOT NULL DEFAULT 'supported',
  evidence_from_cv TEXT,
  why_selected TEXT,
  ai_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_profile
  ON interview_prep_questions(interview_profile_id);

CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_profile_seq
  ON interview_prep_questions(interview_profile_id, sequence);

DROP TRIGGER IF EXISTS interview_prep_questions_updated_at ON interview_prep_questions;
CREATE TRIGGER interview_prep_questions_updated_at
  BEFORE UPDATE ON interview_prep_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
