import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getPromoRepo } from '@/lib/db/repositories/promo';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    is_active?: boolean;
    max_redemptions?: number | null;
    grants_plan?: string | null;
    bonus_credits?: number;
    expires_at?: string | null;
  };

  const promo = await getPromoRepo().update(id, body);
  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(promo);
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const deleted = await getPromoRepo().remove(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
