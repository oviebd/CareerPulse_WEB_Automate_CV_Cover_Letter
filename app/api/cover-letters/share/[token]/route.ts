import { NextResponse } from 'next/server';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 422 });
    }
    const data = await getCoverLettersRepo().getByShareToken(token);
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error('cover-letters share GET', e);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
