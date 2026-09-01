import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getCvsRepo().remove(user.id, id, true);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('core cv DELETE', e);
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
