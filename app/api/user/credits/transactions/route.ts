import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCreditsRepo } from '@/lib/db/repositories/credits';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0));

  const transactions = await getCreditsRepo().listTransactions(user.id, { limit, offset });
  return NextResponse.json({ transactions, limit, offset });
}
