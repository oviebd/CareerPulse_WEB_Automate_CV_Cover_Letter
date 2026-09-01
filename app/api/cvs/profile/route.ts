import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { dbRowToCvProfile } from '@/lib/cv-mapper';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const coreCvId = url.searchParams.get('coreCvId');
    const repo = getCvsRepo();

    if (coreCvId) {
      const data = await repo.getById(user.id, coreCvId);
      return NextResponse.json(data ? dbRowToCvProfile(data as Record<string, unknown>) : null);
    }

    const general = await repo.getLatestGeneral(user.id);
    return NextResponse.json(general ? dbRowToCvProfile(general as Record<string, unknown>) : null);
  } catch (e) {
    console.error('cvs/profile GET', e);
    return NextResponse.json({ error: 'Failed to fetch CV' }, { status: 500 });
  }
}
