-- Add Apex and Nova CV layout templates (HTML files: templates/cv/apex.html, templates/cv/nova.html).

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('apex', 'cv', 'Apex', 'Gradient header, timeline, and sidebar — research & tech roles', 'creative', true, ARRAY['pro','premium','career'], 7),
  ('nova', 'cv', 'Nova', 'Dark sidebar, Syne typography, and project grid', 'creative', true, ARRAY['pro','premium','career'], 8)
ON CONFLICT (id) DO NOTHING;
