-- Five new unified CV templates (Puppeteer HTML under src/templates/{id}/)

INSERT INTO cv_templates (id, type, name, description, category, is_premium, available_tiers, sort_order)
VALUES
  ('amber-strike', 'cv', 'Amber Strike', 'Charcoal sidebar with amber accents', 'creative', true, ARRAY['pro','premium','career'], 20),
  ('midnight-pro', 'cv', 'Midnight Pro', 'Deep navy sidebar for technical roles', 'professional', true, ARRAY['pro','premium','career'], 21),
  ('golden-hour', 'cv', 'Golden Hour', 'Icon-led sections and golden highlights', 'creative', true, ARRAY['pro','premium','career'], 22),
  ('ocean-slate', 'cv', 'Ocean Slate', 'Teal-accented professional layout', 'professional', true, ARRAY['pro','premium','career'], 23),
  ('violet-edge', 'cv', 'Violet Edge', 'Inverted violet creative layout', 'creative', true, ARRAY['premium','career'], 24)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  available_tiers = EXCLUDED.available_tiers,
  sort_order = EXCLUDED.sort_order;
