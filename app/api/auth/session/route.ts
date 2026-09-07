import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import { resolveUserRole, ensureSuperAdminRole } from '@/lib/auth/roles';
import { ensureUserCredits } from '@/lib/credits/grant';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ user: null, profile: null, credits: null });
  }

  if (session.user.email) {
    await ensureSuperAdminRole(session.user.id, session.user.email);
  }

  const [profile, role, balance] = await Promise.all([
    getProfilesRepo().getById(session.user.id),
    resolveUserRole(session.user.id),
    ensureUserCredits(session.user.id),
  ]);

  const enrichedProfile = profile
    ? applyDevSubscriptionOverride({ ...profile, role })
    : null;

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      role,
    },
    profile: enrichedProfile,
    credits: { balance },
  });
}
