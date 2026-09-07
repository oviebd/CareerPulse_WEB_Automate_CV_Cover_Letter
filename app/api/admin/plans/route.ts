import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getPlansRepo } from '@/lib/db/repositories/plans';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;
  const plans = await getPlansRepo().listAll();
  return NextResponse.json(plans);
}
