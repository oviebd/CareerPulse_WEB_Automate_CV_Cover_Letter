import {
  uploadLocalFile,
  deleteLocalFile,
  publicPhotoUrl,
  createSignedLocalPath,
  type StorageBucket,
} from '@/lib/storage/local';

function appOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

export async function storageUpload(
  bucket: StorageBucket,
  objectPath: string,
  file: File
): Promise<{ publicUrl: string | null; signedPath: string | null }> {
  const buf = Buffer.from(await file.arrayBuffer());
  await uploadLocalFile(bucket, objectPath, buf, file.type);
  if (bucket === 'cv-photos') {
    return { publicUrl: publicPhotoUrl(appOrigin(), objectPath), signedPath: null };
  }
  return { publicUrl: null, signedPath: createSignedLocalPath(bucket, objectPath) };
}

export async function storageUploadBuffer(
  bucket: StorageBucket,
  objectPath: string,
  buf: Buffer,
  contentType: string
): Promise<{ signedPath: string }> {
  await uploadLocalFile(bucket, objectPath, buf, contentType);
  return { signedPath: createSignedLocalPath(bucket, objectPath) };
}

export async function storageDelete(bucket: StorageBucket, objectPath: string): Promise<void> {
  await deleteLocalFile(bucket, objectPath);
}

export async function storageSignedUrl(
  bucket: StorageBucket,
  objectPath: string,
  expiresIn = 3600
): Promise<string> {
  return `${appOrigin()}${createSignedLocalPath(bucket, objectPath, expiresIn)}`;
}
