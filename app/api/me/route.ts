import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import { resolveUserRole, ensureSuperAdminRole } from '@/lib/auth/roles';
import { ensureUserCredits } from '@/lib/credits/grant';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function emptyPayload() {
  return NextResponse.json(
    { user: null, profile: null, credits: null },
    { headers: NO_STORE }
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return emptyPayload();
  }

  const userId = session.user.id;
  const email = session.user.email ?? '';

  try {
    if (session.user.email) {
      await ensureSuperAdminRole(userId, session.user.email);
    }

    const [profile, role, balance] = await Promise.all([
      getProfilesRepo().getById(userId),
      resolveUserRole(userId),
      ensureUserCredits(userId),
    ]);

    const enrichedProfile = profile
      ? applyDevSubscriptionOverride({ ...profile, role })
      : null;

    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
          role,
        },
        profile: enrichedProfile,
        credits: { balance },
      },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
          role: 'user' as const,
        },
        profile: null,
        credits: null,
      },
      { headers: NO_STORE }
    );
  }
}
