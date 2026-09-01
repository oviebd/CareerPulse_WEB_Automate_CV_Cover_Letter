import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { dbRowToCvProfile } from '@/lib/cv-mapper';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const url = new URL(request.url);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const generalOnly = url.searchParams.get('generalOnly') === 'true';

    const rows = await getCvsRepo().listByUser(user.id, { includeArchived, generalOnly });
    const cvs = rows.map((r) => dbRowToCvProfile(r as Record<string, unknown>));
    return NextResponse.json(cvs);
  } catch (e) {
    console.error('cvs GET', e);
    return err('Failed to list CVs', 'FETCH_FAILED', 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Untitled CV';

    const data = await getCvsRepo().insert(user.id, { name });
    return NextResponse.json(dbRowToCvProfile(data as Record<string, unknown>));
  } catch (e) {
    console.error('cvs POST', e);
    return err('Failed to create CV', 'CREATE_FAILED', 500);
  }
}
