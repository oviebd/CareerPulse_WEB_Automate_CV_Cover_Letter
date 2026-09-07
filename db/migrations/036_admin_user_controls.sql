-- Admin user controls: account activation and per-user feature permissions

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS can_use_ai BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_create_documents BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_use_interview_prep BOOLEAN NOT NULL DEFAULT true;
