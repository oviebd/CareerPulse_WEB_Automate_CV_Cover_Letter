-- Free onboarding welcome credits: 150 -> 50
UPDATE system_settings
SET value = '50'::jsonb, updated_at = NOW()
WHERE key = 'initial_free_credits';

INSERT INTO system_settings (key, value)
VALUES ('initial_free_credits', '50'::jsonb)
ON CONFLICT (key) DO NOTHING;
