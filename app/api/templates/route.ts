import { NextResponse } from 'next/server';
import { getTemplatesRepo } from '@/lib/db/repositories';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = (url.searchParams.get('type') ?? 'cv') as 'cv' | 'cover_letter';
    const data = await getTemplatesRepo().listByType(type);
    return NextResponse.json(data);
  } catch (e) {
    console.error('templates GET', e);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
