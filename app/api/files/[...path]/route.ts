import { NextResponse } from 'next/server';
import { readLocalFile, type StorageBucket } from '@/lib/storage/local';

type RouteContext = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** Public photos: /api/files/cv-photos/{userId}/file.jpg */
export async function GET(_request: Request, { params }: RouteContext) {
  const segments = (await params).path ?? [];
  const bucket = segments[0] as StorageBucket | undefined;
  const rest = segments.slice(1).map(decodeURIComponent).join('/');
  if (bucket !== 'cv-photos' || !rest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    const buf = await readLocalFile('cv-photos', rest);
    const ext = rest.split('.').pop()?.toLowerCase() ?? '';
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
