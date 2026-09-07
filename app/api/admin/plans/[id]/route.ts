import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getPlansRepo } from '@/lib/db/repositories/plans';

export const runtime = 'nodejs';

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    name?: string;
    description?: string | null;
    is_active?: boolean;
  };

  const plan = await getPlansRepo().update(id, body);
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(plan);
}
