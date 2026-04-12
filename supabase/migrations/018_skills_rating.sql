-- Skills stored as JSONB SkillCategory[] with rated SkillItem entries (see app types).
-- Column is already JSONB in schema 011; ensure type and document shape.

ALTER TABLE cvs
  ALTER COLUMN skills TYPE JSONB USING skills::JSONB;

ALTER TABLE cvs ALTER COLUMN skills SET DEFAULT '[]'::JSONB;

COMMENT ON COLUMN cvs.skills IS
  'SkillCategory[] JSON: [{id,category,displayOrder,items:[{id,name,rating(1-5)}]}]';
