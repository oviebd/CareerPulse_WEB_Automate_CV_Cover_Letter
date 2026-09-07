import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getAdminRepo } from '@/lib/db/repositories/admin';
import { getCreditsRepo } from '@/lib/db/repositories/credits';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const user = await getAdminRepo().getUserDetail(id);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const transactions = await getCreditsRepo().listTransactions(id, { limit: 20 });
  return NextResponse.json({ user, transactions });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    role?: string;
    subscription_tier?: string;
    subscription_status?: string;
    is_active?: boolean;
    can_use_ai?: boolean;
    can_create_documents?: boolean;
    can_use_interview_prep?: boolean;
  };

  const existing = await getAdminRepo().getUserDetail(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.is_active === false) {
    if (id === admin.id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    if (existing.role === 'super_admin') {
      const superAdmins = await getCreditsRepo().countSuperAdmins();
      if (superAdmins <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last super admin.' }, { status: 400 });
      }
    }
    await getAdminRepo().updateUserActive(id, false);
  } else if (body.is_active === true) {
    await getAdminRepo().updateUserActive(id, true);
  }

  if (body.role === 'user' && existing.role === 'super_admin') {
    const superAdmins = await getCreditsRepo().countSuperAdmins();
    if (superAdmins <= 1) {
      return NextResponse.json({ error: 'Cannot demote the last super admin.' }, { status: 400 });
    }
  }

  if (body.role === 'super_admin' || body.role === 'user') {
    await getAdminRepo().updateUserRole(id, body.role);
  }

  if (body.subscription_tier || body.subscription_status) {
    await getProfilesRepo().update(id, {
      ...(body.subscription_tier
        ? { subscription_tier: body.subscription_tier as 'free' | 'pro' }
        : {}),
      ...(body.subscription_status
        ? {
            subscription_status: body.subscription_status as
              | 'active'
              | 'inactive'
              | 'cancelled'
              | 'past_due',
          }
        : {}),
    });
  }

  if (
    body.can_use_ai !== undefined ||
    body.can_create_documents !== undefined ||
    body.can_use_interview_prep !== undefined
  ) {
    await getProfilesRepo().update(id, {
      ...(body.can_use_ai !== undefined ? { can_use_ai: body.can_use_ai } : {}),
      ...(body.can_create_documents !== undefined
        ? { can_create_documents: body.can_create_documents }
        : {}),
      ...(body.can_use_interview_prep !== undefined
        ? { can_use_interview_prep: body.can_use_interview_prep }
        : {}),
    });
  }

  const user = await getAdminRepo().getUserDetail(id);
  return NextResponse.json({ user });
}
