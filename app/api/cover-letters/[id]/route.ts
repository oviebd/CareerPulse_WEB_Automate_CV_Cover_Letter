import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCoverLettersRepo } from '@/lib/db/repositories/cover-letters';
import { stripUndefined } from '@/lib/queries/strip-undefined';

type RouteContext = { params: Promise<{ id: string }> };

function err(msg: string, code: string | undefined, status: number) {
  return NextResponse.json({ error: msg, code }, { status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const data = await getCoverLettersRepo().getById(user.id, id);
    if (!data) return err('Not found', 'NOT_FOUND', 404);
    return NextResponse.json(data);
  } catch (e) {
    console.error('cover-letters GET [id]', e);
    return err('Failed to fetch cover letter', 'FETCH_FAILED', 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    const raw = (await request.json()) as Record<string, unknown>;
    delete raw.id;
    delete raw.user_id;
    delete raw.created_at;
    const patch = stripUndefined(raw);

    const data = await getCoverLettersRepo().update(user.id, id, patch);
    return NextResponse.json(data);
  } catch (e) {
    console.error('cover-letters PATCH', e);
    return err('Failed to update cover letter', 'UPDATE_FAILED', 500);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) return err('Unauthorized', 'UNAUTHORIZED', 401);

    await getCoverLettersRepo().remove(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('cover-letters DELETE', e);
    return err('Failed to delete cover letter', 'DELETE_FAILED', 500);
  }
}
