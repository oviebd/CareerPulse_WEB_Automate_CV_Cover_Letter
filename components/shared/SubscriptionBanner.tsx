'use client';

import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

export function SubscriptionBanner() {
  const { status, expiresAt, tier } = useSubscription();
  if (status !== 'past_due' && status !== 'cancelled') return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      Your <strong>{tier}</strong> subscription needs attention.
      {expiresAt ? ` Access until ${new Date(expiresAt).toLocaleDateString()}.` : null}{' '}
      <Link href="/settings/billing" className="font-semibold underline">
        Billing
      </Link>
    </div>
  );
}
