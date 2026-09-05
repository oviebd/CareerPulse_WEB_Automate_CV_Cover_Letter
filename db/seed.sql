-- CV templates (seed catalog)
INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('classic',     'cv', 'Classic',         'Clean single-column, ATS-optimized',                                     'professional', false, ARRAY['free','pro'], 1),
  ('minimal',     'cv', 'Minimal',         'Sparse executive layout',                                                'minimal',      false, ARRAY['free','pro'], 2),
  ('entry-level', 'cv', 'Entry Level',     'Education-first for graduates',                                          'professional', false, ARRAY['free','pro'], 12),
  ('healthcare',  'cv', 'Healthcare',      'Licenses, clinical experience focus',                                    'professional', false, ARRAY['free','pro'], 13),
  ('ats-plain',   'cv', 'ATS Plain',       'Maximum-compatibility single column',                                    'professional', false, ARRAY['free','pro'], 30),
  ('high-school', 'cv', 'High School',     'Education-first layout for students',                                    'professional', false, ARRAY['free','pro'], 31),
  ('executive',   'cv', 'Executive',       'Conservative serif layout for senior leadership',                        'executive',    false, ARRAY['free','pro'], 32),
  ('researcher',  'cv', 'PhD / Researcher','Publication-led academic CV',                                          'professional', false, ARRAY['free','pro'], 33),
  ('europass',    'cv', 'Europass',        'The standardized EU CV format',                                          'professional', false, ARRAY['free','pro'], 34),
  ('modern',      'cv', 'Modern',          'Two-column with skills sidebar',                                         'professional', true,  ARRAY['pro'], 3),
  ('academic',    'cv', 'Academic',        'Publications-first for researchers',                                     'professional', true,  ARRAY['pro'], 9),
  ('technical',   'cv', 'Technical',       'Skills matrix + projects focus',                                         'professional', true,  ARRAY['pro'], 10),
  ('creative',    'cv', 'Creative',        'Visual layout with photo support',                                       'creative',     true,  ARRAY['pro'], 11),
  ('amber-strike','cv', 'Amber Strike',    'Charcoal sidebar, amber accents',                                        'creative',     true,  ARRAY['pro'], 20),
  ('midnight-pro','cv', 'Midnight Pro',    'Deep navy sidebar, electric blue highlights',                            'professional', true,  ARRAY['pro'], 21),
  ('golden-hour', 'cv', 'Golden Hour',     'Icon-led sections, timeline experience',                                 'creative',     true,  ARRAY['pro'], 22),
  ('ocean-slate', 'cv', 'Ocean Slate',     'Ocean blue sidebar, teal chips',                                         'professional', true,  ARRAY['pro'], 23),
  ('violet-edge', 'cv', 'Violet Edge',     'Inverted layout, violet header band',                                      'creative',     true,  ARRAY['pro'], 24)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order = EXCLUDED.sort_order;

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('cl-classic',  'cover_letter', 'Classic',           'Traditional letter format',          'professional', false, ARRAY['free','pro'], 1),
  ('cl-modern',   'cover_letter', 'Modern Block',      'Clean modern, no indents',           'minimal',      false, ARRAY['free','pro'], 2),
  ('cl-minimal',  'cover_letter', 'Minimal',           'Ultra-sparse cover letter',          'minimal',      true,  ARRAY['pro'], 3),
  ('cl-formal',   'cover_letter', 'Formal Letterhead', 'Company letterhead style',           'executive',    true,  ARRAY['pro'], 4),
  ('cl-creative', 'cover_letter', 'Creative Header',   'Bold name header, visual accent',    'creative',     true,  ARRAY['pro'], 5)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order = EXCLUDED.sort_order;
