import { NextResponse } from 'next/server';
import { readLocalFile, verifySignedToken } from '@/lib/storage/local';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 422 });

  const verified = verifySignedToken(token);
  if (!verified) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 403 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!verified.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ext = verified.path.split('.').pop()?.toLowerCase() ?? '';
  const mime =
    ext === 'pdf'
      ? 'application/pdf'
      : ext === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';

  const buf = await readLocalFile(verified.bucket, verified.path);
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': mime, 'Cache-Control': 'private, max-age=3600' },
  });
}
