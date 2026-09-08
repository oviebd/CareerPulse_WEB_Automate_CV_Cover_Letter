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

  if (body.max_redemptions != null) {
    if (!Number.isInteger(body.max_redemptions) || body.max_redemptions < 1) {
      return NextResponse.json(
        { error: 'Maximum uses must be a whole number of at least 1, or null for unlimited.' },
        { status: 400 }
      );
    }
    const existing = await getPromoRepo().findById(id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (body.max_redemptions < existing.redemption_count) {
      return NextResponse.json(
        {
          error: `Maximum uses cannot be less than current usage (${existing.redemption_count}).`,
        },
        { status: 400 }
      );
    }
  }

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
