-- Link likely interview questions to preparation topics

ALTER TABLE interview_prep_questions
  ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES interview_preparation_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interview_prep_questions_profile_topic
  ON interview_prep_questions(interview_profile_id, topic_id);
