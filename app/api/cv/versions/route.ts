import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCvsRepo } from '@/lib/db/repositories/cvs';

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await getCvsRepo().listByUser(user.id);
    const versions = rows.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      completion_percentage: r.completion_percentage,
      is_complete: r.is_complete,
      created_at: r.created_at,
      preferred_template_id: r.preferred_template_id,
    }));

    return NextResponse.json({ versions });
  } catch (e) {
    console.error('cv versions route', e);
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
