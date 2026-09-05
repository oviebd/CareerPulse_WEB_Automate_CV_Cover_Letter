import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getCharsPerToken } from '@/lib/ai/token-estimate';
import { getAiUsageRepo } from '@/lib/db/repositories/ai-usage';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const repo = getAiUsageRepo();
  const [totals, breakdown, recent] = await Promise.all([
    repo.aggregateTotals(user.id),
    repo.aggregateByCategory(user.id),
    repo.listRecent(user.id, 50),
  ]);

  return NextResponse.json({
    chars_per_token: getCharsPerToken(),
    totals,
    breakdown,
    recent,
  });
}
