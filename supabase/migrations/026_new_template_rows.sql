-- New CV templates: ats-plain, high-school, executive, researcher, europass
-- Also retires amber-strike, golden-hour, ocean-slate, violet-edge from the picker
-- by marking them non-visible (is_premium stays true so existing CVs still render).

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('ats-plain',   'cv', 'ATS Plain',       'Maximum-compatibility single column — safe for any applicant tracking system.', 'professional', false, ARRAY['free','pro','premium','career'], 30),
  ('high-school', 'cv', 'High School',      'Education-first layout for students with limited work history.',                 'professional', false, ARRAY['free','pro','premium','career'], 31),
  ('executive',   'cv', 'Executive',        'Conservative serif layout for senior leadership, with a competencies grid.',     'professional', false, ARRAY['free','pro','premium','career'], 32),
  ('researcher',  'cv', 'PhD / Researcher', 'Publication-led academic CV with grants, presentations, and teaching.',         'professional', false, ARRAY['free','pro','premium','career'], 33),
  ('europass',    'cv', 'Europass',         'The standardized EU CV format, including the CEFR language grid.',              'professional', false, ARRAY['free','pro','premium','career'], 34)
ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  description      = EXCLUDED.description,
  category         = EXCLUDED.category,
  is_premium       = EXCLUDED.is_premium,
  available_tiers  = EXCLUDED.available_tiers,
  sort_order       = EXCLUDED.sort_order;
