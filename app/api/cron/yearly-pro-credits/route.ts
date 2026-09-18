import { NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { subscriptions } from '@/lib/db/schema';
import { effectiveAccessTier } from '@/lib/access/premium';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import {
  grantProSubscriptionSafetyCredits,
  PRO_SUBSCRIPTION_SAFETY_CREDITS,
} from '@/lib/credits/paddle-grants';

export const runtime = 'nodejs';

function utcMonthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Grants monthly safety credits to yearly Pro subscribers (Paddle bills once per year). */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthKey = utcMonthKey();
  const db = getDb();
  const rows = await db
    .select({
      userId: subscriptions.userId,
      paddleSubscriptionId: subscriptions.paddleSubscriptionId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.billingInterval, 'yearly'),
        inArray(subscriptions.status, ['active', 'trialing', 'past_due'])
      )
    );

  let granted = 0;
  for (const row of rows) {
    const profile = await getProfilesRepo().getById(row.userId);
    if (effectiveAccessTier(profile) !== 'pro') continue;

    const syntheticTxnId = `yearly_cron:${row.userId}:${monthKey}`;
    const did = await grantProSubscriptionSafetyCredits(row.userId, syntheticTxnId);
    if (did) granted += 1;
  }

  return NextResponse.json({
    ok: true,
    month: monthKey,
    candidates: rows.length,
    granted,
    credits_each: PRO_SUBSCRIPTION_SAFETY_CREDITS,
  });
}
