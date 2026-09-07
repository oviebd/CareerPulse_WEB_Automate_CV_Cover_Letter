import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCvStorageContentType } from '@/lib/cv-file';
import { assertFileSize } from '@/lib/file-magic';
import { storageDelete, storageSignedUrl, storageUpload } from '@/lib/storage';

const BUCKETS = ['cv-uploads', 'pdf-exports', 'cv-photos'] as const;
type Bucket = (typeof BUCKETS)[number];

function isBucket(v: string): v is Bucket {
  return (BUCKETS as readonly string[]).includes(v);
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const bucket = form.get('bucket');
    const file = form.get('file');
    const pathParam = form.get('path');

    if (typeof bucket !== 'string' || !isBucket(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 422 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 422 });
    }
    try {
      assertFileSize(file.size);
    } catch {
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }

    const path =
      typeof pathParam === 'string' && pathParam.startsWith(`${user.id}/`)
        ? pathParam
        : `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;

    const uploadFile =
      bucket === 'cv-uploads'
        ? new File([await file.arrayBuffer()], file.name, {
            type: getCvStorageContentType(file),
          })
        : file;

    const { publicUrl, signedPath } = await storageUpload(bucket, path, uploadFile);
    return NextResponse.json({ path, bucket, publicUrl, signedUrl: signedPath });
  } catch (e) {
    console.error('uploads POST', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as { bucket?: string; path?: string };
    if (!body.bucket || !body.path || !isBucket(body.bucket)) {
      return NextResponse.json({ error: 'Invalid bucket or path' }, { status: 422 });
    }
    if (!body.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    await storageDelete(body.bucket, body.path);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('uploads DELETE', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
