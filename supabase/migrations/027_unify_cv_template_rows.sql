-- Unify the cv_templates catalog with the 18 unified template ids.
--
-- 1) Remove legacy pre-unification rows (they duplicate unified layouts on the
--    landing page; existing CVs keep rendering via LEGACY_TEMPLATE_ID_MAP).
-- 2) Re-activate the four retired premium variants (amber-strike, golden-hour,
--    ocean-slate, violet-edge) as Pro-gated templates.
-- 3) Backfill rows for templates added in later migrations so every unified id
--    has a row (the /cv/templates/[id]/preview page 404s without one).
--
-- Idempotent: safe to run on any database state, any number of times.

DELETE FROM cv_templates
WHERE type = 'cv'
  AND id IN ('sidebar', 'bold-header', 'two-column', 'apex', 'nova');

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  -- Free tier
  ('classic',     'cv', 'Classic',         'Clean single-column, ATS-optimized',                                     'professional', false, ARRAY['free','pro','premium','career'], 1),
  ('minimal',     'cv', 'Minimal',         'Sparse executive layout',                                                'minimal',      false, ARRAY['free','pro','premium','career'], 2),
  ('entry-level', 'cv', 'Entry Level',     'Education-first for graduates',                                          'professional', false, ARRAY['free','pro','premium','career'], 12),
  ('healthcare',  'cv', 'Healthcare',      'Licenses, clinical experience focus',                                    'professional', false, ARRAY['free','pro','premium','career'], 13),
  ('ats-plain',   'cv', 'ATS Plain',       'Maximum-compatibility single column — safe for any applicant tracking system.', 'professional', false, ARRAY['free','pro','premium','career'], 30),
  ('high-school', 'cv', 'High School',     'Education-first layout for students with limited work history.',         'professional', false, ARRAY['free','pro','premium','career'], 31),
  ('executive',   'cv', 'Executive',       'Conservative serif layout for senior leadership, with a competencies grid.', 'executive',   false, ARRAY['free','pro','premium','career'], 32),
  ('researcher',  'cv', 'PhD / Researcher','Publication-led academic CV with grants, presentations, and teaching.',  'professional', false, ARRAY['free','pro','premium','career'], 33),
  ('europass',    'cv', 'Europass',        'The standardized EU CV format, including the CEFR language grid.',      'professional', false, ARRAY['free','pro','premium','career'], 34),
  -- Pro tier (free users can preview but not set as default / export)
  ('modern',      'cv', 'Modern',          'Two-column with skills sidebar',                                         'professional', true,  ARRAY['pro','premium','career'], 3),
  ('academic',    'cv', 'Academic',        'Publications-first for researchers',                                     'professional', true,  ARRAY['pro','premium','career'], 9),
  ('technical',   'cv', 'Technical',       'Skills matrix + projects focus',                                         'professional', true,  ARRAY['pro','premium','career'], 10),
  ('creative',    'cv', 'Creative',        'Visual layout with photo support',                                       'creative',     true,  ARRAY['pro','premium','career'], 11),
  ('amber-strike','cv', 'Amber Strike',    'Charcoal sidebar, amber accents, creative energy',                       'creative',     true,  ARRAY['pro','premium','career'], 20),
  ('midnight-pro','cv', 'Midnight Pro',    'Deep navy sidebar, electric blue highlights',                            'professional', true,  ARRAY['pro','premium','career'], 21),
  ('golden-hour', 'cv', 'Golden Hour',     'Icon-led sections, timeline experience, golden accents',                 'creative',     true,  ARRAY['pro','premium','career'], 22),
  ('ocean-slate', 'cv', 'Ocean Slate',     'Ocean blue sidebar, teal chips and accents',                             'professional', true,  ARRAY['pro','premium','career'], 23),
  ('violet-edge', 'cv', 'Violet Edge',     'Inverted layout, violet header band, timeline main column',              'creative',     true,  ARRAY['pro','premium','career'], 24)
ON CONFLICT (id) DO UPDATE SET
  type            = EXCLUDED.type,
  name            = EXCLUDED.name,
  description     = EXCLUDED.description,
  category        = EXCLUDED.category,
  is_premium      = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order      = EXCLUDED.sort_order;
