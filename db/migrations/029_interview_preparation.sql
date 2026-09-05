-- Interview Preparation module tables

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
  profession TEXT,
  occupation TEXT,
  role TEXT,
  domain TEXT,
  seniority TEXT,
  interview_stage TEXT,
  interview_date TIMESTAMPTZ,
  candidate_summary TEXT,
  job_summary TEXT,
  blueprint_json JSONB,
  gap_json JSONB,
  clarification_json JSONB,
  ai_metadata_json JSONB,
  readiness_score INTEGER CHECK (readiness_score BETWEEN 0 AND 100),
  source_job_hash TEXT,
  source_cv_hash TEXT,
  extra_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS interview_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  importance TEXT,
  priority INTEGER,
  evidence_from_job TEXT,
  evidence_from_candidate TEXT,
  mastery_score INTEGER,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_preparation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  title TEXT,
  duration_days INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  plan_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_preparation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES interview_preparation_plans(id) ON DELETE CASCADE,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER,
  estimated_minutes INTEGER,
  learning_objectives_json JSONB,
  mastery_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES interview_preparation_topics(id) ON DELETE SET NULL,
  title TEXT,
  difficulty TEXT,
  question_count INTEGER,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES interview_quizzes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options_json JSONB,
  correct_answer_json JSONB,
  evaluation_rubric_json JSONB,
  explanation TEXT,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT,
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS interview_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES interview_quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER,
  answers_json JSONB,
  evaluation_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mock',
  mode TEXT NOT NULL DEFAULT 'practice',
  difficulty TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  question_count INTEGER NOT NULL DEFAULT 0,
  target_question_count INTEGER,
  duration_minutes INTEGER,
  current_question_id UUID,
  draft_answer TEXT,
  overall_score INTEGER,
  evaluation_json JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  competency_id UUID REFERENCES interview_competencies(id) ON DELETE SET NULL,
  difficulty TEXT,
  expected_points_json JSONB,
  evaluation_rubric_json JSONB,
  parent_question_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  text_answer TEXT,
  transcript TEXT,
  audio_path TEXT,
  duration_seconds INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES interview_answers(id) ON DELETE CASCADE,
  overall_score INTEGER,
  dimension_scores_json JSONB,
  strengths_json JSONB,
  weaknesses_json JSONB,
  missing_points_json JSONB,
  feedback TEXT,
  recommended_actions_json JSONB,
  ai_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_profile_id UUID NOT NULL REFERENCES interview_profiles(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES interview_competencies(id) ON DELETE CASCADE,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  confidence INTEGER,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  last_assessed_at TIMESTAMPTZ,
  trend TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (interview_profile_id, competency_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_profiles_user ON interview_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_profiles_job ON interview_profiles(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_competencies_profile ON interview_competencies(interview_profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_plans_profile ON interview_preparation_plans(interview_profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_topics_plan ON interview_preparation_topics(plan_id);
CREATE INDEX IF NOT EXISTS idx_interview_quizzes_profile ON interview_quizzes(interview_profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_quiz_questions_quiz ON interview_quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_interview_quiz_attempts_quiz ON interview_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_profile ON interview_sessions(interview_profile_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(interview_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_interview_questions_session ON interview_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_answers_question ON interview_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_evaluations_answer ON interview_evaluations(answer_id);
CREATE INDEX IF NOT EXISTS idx_interview_mastery_profile ON interview_mastery(interview_profile_id);

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
