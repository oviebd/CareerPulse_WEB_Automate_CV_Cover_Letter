import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getAdminRepo } from '@/lib/db/repositories/admin';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;
  const stats = await getAdminRepo().dashboardStats();
  return NextResponse.json(stats);
}
