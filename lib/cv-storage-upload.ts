import type { SupabaseClient } from '@supabase/supabase-js';
import { getCvStorageContentType } from '@/lib/cv-file';

/**
 * Upload via the official Supabase client (same code path as before XHR).
 * Byte-level progress is not available with multipart uploads in most browsers, so we
 * animate 0→~90% while the request runs, then 100% on success.
 *
 * Supabase checklist (project dashboard + SQL):
 * - Run `supabase/migrations/002_storage.sql` (bucket `cv-uploads` + RLS policies).
 * - `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` and anon/publishable key.
 * - Storage → Policies: authenticated users can insert under `user_id/...` (see migration).
 */
export async function uploadCvFileWithProgress(
  supabase: SupabaseClient,
  path: string,
  file: File,
  options: { cacheControl: string; upsert: boolean },
  onProgress: (percent: number) => void
): Promise<{ error: Error | null }> {
  const debug =
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('DEBUG_CV_UPLOAD') === '1';
  const log = (...args: unknown[]) => {
    if (debug) console.log('[cv-upload]', ...args);
  };

  const contentType = getCvStorageContentType(file);
  log('upload start', { path, bytes: file.size, contentType });

  let simulated = 5;
  onProgress(simulated);
  const interval = setInterval(() => {
    simulated = Math.min(simulated + 4, 90);
    onProgress(simulated);
  }, 120);

  try {
    const { error } = await supabase.storage.from('cv-uploads').upload(path, file, {
      cacheControl: options.cacheControl,
      upsert: options.upsert,
      contentType,
    });

    if (error) {
      log('storage error', error);
      onProgress(0);
      return { error: new Error(error.message) };
    }

    onProgress(100);
    log('upload done');
    return { error: null };
  } catch (e) {
    log('upload threw', e);
    onProgress(0);
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    clearInterval(interval);
  }
}
