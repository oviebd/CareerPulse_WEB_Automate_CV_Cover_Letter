-- Idempotent seed for cover letter template rows.
-- 001_schema.sql inserted these without ON CONFLICT, so they may be missing
-- on databases provisioned before the cover-letter templates were added.
INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('cl-classic',  'cover_letter', 'Classic',           'Traditional letter format',          'professional', false, ARRAY['free','pro','premium','career'], 1),
  ('cl-modern',   'cover_letter', 'Modern Block',       'Clean modern, no indents',           'minimal',      false, ARRAY['free','pro','premium','career'], 2),
  ('cl-minimal',  'cover_letter', 'Minimal',            'Ultra-sparse cover letter',          'minimal',      true,  ARRAY['pro','premium','career'],        3),
  ('cl-formal',   'cover_letter', 'Formal Letterhead',  'Company letterhead style',           'executive',    true,  ARRAY['pro','premium','career'],        4),
  ('cl-creative', 'cover_letter', 'Creative Header',    'Bold name header, visual accent',    'creative',     true,  ARRAY['premium','career'],              5)
ON CONFLICT (id) DO UPDATE SET
  name            = EXCLUDED.name,
  description     = EXCLUDED.description,
  category        = EXCLUDED.category,
  is_premium      = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order      = EXCLUDED.sort_order;
