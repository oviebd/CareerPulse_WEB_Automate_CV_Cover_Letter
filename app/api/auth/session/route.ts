import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ user: null, profile: null });
  }
  const profile = await getProfilesRepo().getById(session.user.id);
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    profile: profile ? applyDevSubscriptionOverride(profile) : null,
  });
}
