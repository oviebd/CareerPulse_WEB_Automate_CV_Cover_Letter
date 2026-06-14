-- Europass optional fields: cefr, dateOfBirth, nationality
-- These fields are stored in existing JSONB columns:
--   - languages column (JSONB array): each entry may include a "cefr" object
--   - cv_extra column (JSONB): may include a "personalExtra" object with dateOfBirth and nationality
-- No structural schema change is required because the columns already accept arbitrary JSONB.
-- This migration records the intent and is safe to run on any environment.
SELECT 1;
