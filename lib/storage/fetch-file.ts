import { isAllowedStorageUrl } from '@/lib/extract-document-text';
import { readLocalFile, verifySignedToken } from '@/lib/storage/local';

export type StorageFileFetchError = 'invalid_file_url' | 'file_fetch_failed';

/** Read an uploaded CV/CL file from local disk via a signed URL. */
export async function fetchStorageFileBuffer(
  fileUrl: string,
  userId: string
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: StorageFileFetchError }> {
  if (!isAllowedStorageUrl(fileUrl)) {
    return { ok: false, error: 'invalid_file_url' };
  }

  try {
    const parsed = new URL(fileUrl);
    if (parsed.pathname !== '/api/files/signed') {
      return { ok: false, error: 'file_fetch_failed' };
    }
    const token = parsed.searchParams.get('token');
    if (!token) return { ok: false, error: 'file_fetch_failed' };

    const verified = verifySignedToken(token);
    if (!verified || !verified.path.startsWith(`${userId}/`)) {
      return { ok: false, error: 'file_fetch_failed' };
    }

    const buffer = await readLocalFile(verified.bucket, verified.path);
    return { ok: true, buffer };
  } catch (e) {
    console.error('fetchStorageFileBuffer', e);
    return { ok: false, error: 'file_fetch_failed' };
  }
}
