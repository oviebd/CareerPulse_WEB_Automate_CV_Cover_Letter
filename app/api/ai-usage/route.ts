import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { isAiUsageVisibleToUser } from '@/lib/ai/show-usage';
import { getAiUsageRepo } from '@/lib/db/repositories/ai-usage';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const profile = await getProfilesRepo().getById(user.id);
  if (!isAiUsageVisibleToUser(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const repo = getAiUsageRepo();
  const [totals, breakdown, recent] = await Promise.all([
    repo.aggregateTotals(user.id),
    repo.aggregateByCategory(user.id),
    repo.listRecent(user.id, 50),
  ]);

  return NextResponse.json({
    totals,
    breakdown,
    recent,
  });
}
