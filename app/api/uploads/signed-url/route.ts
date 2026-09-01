import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { storageSignedUrl } from '@/lib/storage';

const BUCKETS = ['cv-uploads', 'pdf-exports', 'cv-photos'] as const;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as { bucket?: string; path?: string; expiresIn?: number };
    if (
      !body.bucket ||
      !body.path ||
      !(BUCKETS as readonly string[]).includes(body.bucket)
    ) {
      return NextResponse.json({ error: 'Invalid bucket or path' }, { status: 422 });
    }
    if (!body.path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
    }

    const signedUrl = await storageSignedUrl(
      body.bucket as (typeof BUCKETS)[number],
      body.path,
      typeof body.expiresIn === 'number' ? body.expiresIn : 3600
    );
    return NextResponse.json({ signedUrl });
  } catch (e) {
    console.error('uploads/signed-url POST', e);
    return NextResponse.json({ error: 'Signed URL failed' }, { status: 500 });
  }
}
