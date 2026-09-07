import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), 'data', 'uploads');

export type StorageBucket = 'cv-uploads' | 'pdf-exports' | 'cv-photos' | 'interview-audio';

function bucketDir(bucket: StorageBucket): string {
  return path.join(UPLOAD_ROOT, bucket);
}

function resolvePath(bucket: StorageBucket, objectPath: string): string {
  const normalized = path.normalize(objectPath).replace(/^(\.\.(\/|\\|$))+/, '');
  if (normalized.includes('..')) throw new Error('Invalid path');
  return path.join(bucketDir(bucket), normalized);
}

export async function ensureUploadDirs(): Promise<void> {
  await Promise.all(
    (['cv-uploads', 'pdf-exports', 'cv-photos', 'interview-audio'] as StorageBucket[]).map((b) =>
      fs.mkdir(bucketDir(b), { recursive: true })
    )
  );
}

export async function uploadLocalFile(
  bucket: StorageBucket,
  objectPath: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  await ensureUploadDirs();
  const full = resolvePath(bucket, objectPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  void contentType;
}

export async function deleteLocalFile(bucket: StorageBucket, objectPath: string): Promise<void> {
  const full = resolvePath(bucket, objectPath);
  await fs.rm(full, { force: true });
}

export async function readLocalFile(bucket: StorageBucket, objectPath: string): Promise<Buffer> {
  return fs.readFile(resolvePath(bucket, objectPath));
}

export function publicPhotoUrl(appOrigin: string, objectPath: string): string {
  return `${appOrigin.replace(/\/$/, '')}/api/files/cv-photos/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

export function createSignedLocalPath(
  bucket: StorageBucket,
  objectPath: string,
  expiresInSec = 3600
): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const payload = `${bucket}:${objectPath}:${exp}`;
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-secret');
  if (!secret) throw new Error('AUTH_SECRET or JWT_SECRET must be set');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${sig}`).toString('base64url');
  return `/api/files/signed?token=${token}`;
}

export function verifySignedToken(token: string): { bucket: StorageBucket; path: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [bucket, objectPath, expStr, sig] = decoded.split(':');
    if (!bucket || !objectPath || !expStr || !sig) return null;
    if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
    const secret =
      process.env.AUTH_SECRET?.trim() ||
      process.env.JWT_SECRET?.trim() ||
      (process.env.NODE_ENV === 'production' ? '' : 'dev-secret');
    if (!secret) return null;
    const payload = `${bucket}:${objectPath}:${expStr}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expected !== sig) return null;
    return { bucket: bucket as StorageBucket, path: objectPath };
  } catch {
    return null;
  }
}
