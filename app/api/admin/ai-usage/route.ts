import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getAdminRepo } from '@/lib/db/repositories/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));
  const userId = url.searchParams.get('userId') ?? undefined;

  const usage = await getAdminRepo().listAiUsage({ limit, offset, userId });
  return NextResponse.json({ usage, limit, offset });
}
