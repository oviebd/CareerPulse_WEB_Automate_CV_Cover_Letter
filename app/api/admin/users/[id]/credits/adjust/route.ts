import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getCreditsRepo } from '@/lib/db/repositories/credits';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const body = (await request.json()) as { amount?: number; description?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: 'amount_required' }, { status: 400 });
  }

  try {
    const result = await getCreditsRepo().adjustCredits({
      userId: id,
      amount,
      description: body.description?.trim() || 'Admin credit adjustment',
      createdBy: admin.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'adjust_failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
