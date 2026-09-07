import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getPromoRepo } from '@/lib/db/repositories/promo';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(await getPromoRepo().listAll());
}

export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json()) as {
    code?: string;
    is_active?: boolean;
    max_redemptions?: number | null;
    grants_plan?: string | null;
    bonus_credits?: number;
    expires_at?: string | null;
  };

  if (!body.code?.trim()) {
    return NextResponse.json({ error: 'code_required' }, { status: 400 });
  }

  const promo = await getPromoRepo().create({
    code: body.code.trim(),
    is_active: body.is_active,
    max_redemptions: body.max_redemptions,
    grants_plan: body.grants_plan,
    bonus_credits: body.bonus_credits,
    expires_at: body.expires_at,
  });
  return NextResponse.json(promo, { status: 201 });
}
