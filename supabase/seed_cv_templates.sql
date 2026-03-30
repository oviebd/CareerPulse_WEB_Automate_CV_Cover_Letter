-- Optional: run in Supabase SQL Editor if templates are missing.
-- Initial migration 001_schema.sql already inserts these rows.

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('classic',     'cv', 'Classic',     'Clean single-column, universally accepted',  'professional', false, ARRAY['free','pro','premium','career'], 1),
  ('minimal',     'cv', 'Minimal',     'Ultra-clean, maximum whitespace',            'minimal',      false, ARRAY['free','pro','premium','career'], 2),
  ('sidebar',     'cv', 'Sidebar',     'Two-column with skills sidebar',             'professional', true,  ARRAY['pro','premium','career'],        3),
  ('bold-header', 'cv', 'Bold Header', 'Full-width colored header band',             'creative',     true,  ARRAY['pro','premium','career'],        4),
  ('two-column',  'cv', 'Two Column',  'Equal two-column body layout',               'professional', true,  ARRAY['pro','premium','career'],        5),
  ('executive',   'cv', 'Executive',   'Dense serif layout for senior roles',        'executive',    true,  ARRAY['premium','career'],              6),
  ('apex',        'cv', 'Apex',        'Gradient header, timeline, and sidebar',      'creative',     true,  ARRAY['pro','premium','career'],        7),
  ('nova',        'cv', 'Nova',        'Dark sidebar and project grid',             'creative',     true,  ARRAY['pro','premium','career'],        8)
ON CONFLICT (id) DO NOTHING;
