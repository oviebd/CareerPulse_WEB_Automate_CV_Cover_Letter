-- Phase 1: Storage buckets + policies. Run after 001_schema.sql in Supabase SQL Editor.
-- Paths: cv-uploads/{user_id}/..., pdf-exports/{user_id}/...

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'cv-uploads',
    'cv-uploads',
    false,
    10485760,
    ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  ('pdf-exports', 'pdf-exports', false, NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- cv-uploads: authenticated users manage objects under their user id folder
CREATE POLICY "cv_uploads_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "cv_uploads_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-uploads' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "cv_uploads_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'cv-uploads' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "cv_uploads_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'cv-uploads' AND split_part(name, '/', 1) = auth.uid()::text);

-- pdf-exports: same path convention
CREATE POLICY "pdf_exports_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pdf-exports' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "pdf_exports_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdf-exports' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "pdf_exports_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pdf-exports' AND split_part(name, '/', 1) = auth.uid()::text);

CREATE POLICY "pdf_exports_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdf-exports' AND split_part(name, '/', 1) = auth.uid()::text);
