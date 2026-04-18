-- Three additional unified CV templates (src/templates/{id}/)

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('modern-sidebar', 'cv', 'Modern Sidebar', 'Navy sidebar with skill bars — broad professional appeal', 'professional', true, ARRAY['pro','premium','career'], 25),
  ('bold-charcoal', 'cv', 'Bold Charcoal', 'Charcoal sidebar with yellow accents and split name', 'creative', true, ARRAY['pro','premium','career'], 26),
  ('midnight-navy', 'cv', 'Midnight Navy', 'Deep navy sidebar with circle-bullet skills', 'professional', true, ARRAY['pro','premium','career'], 27)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order = EXCLUDED.sort_order;
