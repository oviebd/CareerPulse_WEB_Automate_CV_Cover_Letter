import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import type { Profile } from '@/types';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await getProfilesRepo().getById(user.id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(applyDevSubscriptionOverride(profile));
  } catch (e) {
    console.error('account GET', e);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as {
      full_name?: string;
      preferred_cl_template_id?: string;
    };
    const patch: Partial<Profile> = {};
    if (typeof body.full_name === 'string') patch.full_name = body.full_name;
    if (typeof body.preferred_cl_template_id === 'string') {
      patch.preferred_cl_template_id = body.preferred_cl_template_id;
    }
    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 422 });
    }

    const data = await getProfilesRepo().update(user.id, patch);
    return NextResponse.json(applyDevSubscriptionOverride(data));
  } catch (e) {
    console.error('account PATCH', e);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { getUsersRepo } = await import('@/lib/db/repositories/users');
    const { signOut } = await import('@/lib/auth');
    await getUsersRepo().remove(user.id);
    await signOut({ redirect: false });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('account DELETE', e);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
