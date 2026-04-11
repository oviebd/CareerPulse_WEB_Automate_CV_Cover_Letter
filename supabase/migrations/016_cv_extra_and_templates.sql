-- Extended CV JSONB + unified template catalog (8 layouts)

ALTER TABLE cvs ADD COLUMN IF NOT EXISTS cv_extra JSONB NOT NULL DEFAULT '{}';

-- Map legacy template ids to the unified catalog
UPDATE cvs SET preferred_template_id = CASE preferred_template_id
  WHEN 'sidebar' THEN 'modern'
  WHEN 'bold-header' THEN 'creative'
  WHEN 'two-column' THEN 'technical'
  WHEN 'executive' THEN 'minimal'
  WHEN 'apex' THEN 'modern'
  WHEN 'nova' THEN 'technical'
  ELSE preferred_template_id
END
WHERE preferred_template_id IN (
  'sidebar', 'bold-header', 'two-column', 'executive', 'apex', 'nova'
);

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('modern', 'cv', 'Modern', 'Two-column with skills sidebar', 'professional', true, ARRAY['pro','premium','career'], 3),
  ('academic', 'cv', 'Academic', 'Publications-first for researchers', 'professional', true, ARRAY['premium','career'], 9),
  ('technical', 'cv', 'Technical', 'Skills matrix + projects focus', 'professional', true, ARRAY['pro','premium','career'], 10),
  ('creative', 'cv', 'Creative', 'Visual layout with photo support', 'creative', true, ARRAY['pro','premium','career'], 11),
  ('entry-level', 'cv', 'Entry Level', 'Education-first for graduates', 'professional', false, ARRAY['free','pro','premium','career'], 12),
  ('healthcare', 'cv', 'Healthcare', 'Licenses and clinical experience', 'professional', false, ARRAY['free','pro','premium','career'], 13)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order = EXCLUDED.sort_order;
