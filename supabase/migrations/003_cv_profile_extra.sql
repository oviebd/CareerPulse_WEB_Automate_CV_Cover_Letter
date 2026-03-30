-- CV profile: address, photo URL, referrals, section visibility; public bucket for CV photos.

ALTER TABLE cv_profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS referrals JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS section_visibility JSONB NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-photos',
  'cv-photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "cv_photos_select_public" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "cv_photos_delete_own" ON storage.objects;

CREATE POLICY "cv_photos_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'cv-photos');

CREATE POLICY "cv_photos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-photos' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "cv_photos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cv-photos' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "cv_photos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cv-photos' AND split_part(name, '/', 1) = auth.uid()::text);
