import { getCvStorageContentType } from '@/lib/cv-file';

type UploadBucket = 'cv-uploads' | 'pdf-exports' | 'cv-photos';

/**
 * Upload a file via the Next.js API (local disk storage).
 * Byte-level progress is simulated while the request runs.
 */
export async function uploadFileWithProgress(
  bucket: UploadBucket,
  path: string,
  file: File,
  options: { cacheControl?: string; upsert?: boolean },
  onProgress: (percent: number) => void
): Promise<{ error: Error | null; publicUrl?: string | null }> {
  let simulated = 5;
  onProgress(simulated);
  const interval = setInterval(() => {
    simulated = Math.min(simulated + 4, 90);
    onProgress(simulated);
  }, 120);

  try {
    const form = new FormData();
    form.set('bucket', bucket);
    form.set('path', path);
    form.set('file', file);

    const res = await fetch('/api/uploads', {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      onProgress(0);
      return { error: new Error(json.error ?? `Upload failed (HTTP ${res.status})`) };
    }
    const json = (await res.json()) as { publicUrl?: string | null };
    onProgress(100);
    return { error: null, publicUrl: json.publicUrl ?? null };
  } catch (e) {
    onProgress(0);
    return { error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    clearInterval(interval);
  }
}

export async function createSignedUploadUrl(
  bucket: UploadBucket,
  path: string,
  expiresIn = 3600
): Promise<{ signedUrl: string | null; error: Error | null }> {
  try {
    const res = await fetch('/api/uploads/signed-url', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket, path, expiresIn }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { signedUrl: null, error: new Error(json.error ?? 'Signed URL failed') };
    }
    const json = (await res.json()) as { signedUrl: string };
    return { signedUrl: json.signedUrl, error: null };
  } catch (e) {
    return { signedUrl: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function removeUploadedFile(
  bucket: UploadBucket,
  path: string
): Promise<void> {
  await fetch('/api/uploads', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path }),
  });
}

export { getCvStorageContentType };
