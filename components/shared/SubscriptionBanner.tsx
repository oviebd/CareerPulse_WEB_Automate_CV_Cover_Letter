'use client';

import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

export function SubscriptionBanner() {
  const { status, expiresAt, tier } = useSubscription();
  if (status !== 'past_due' && status !== 'cancelled') return null;
  return (
    <div className="relative z-20 border-b border-[var(--color-accent-gold)]/30 bg-[var(--color-accent-gold)]/10 px-4 py-2 text-center text-sm text-[var(--color-accent-gold)]">
      Your <strong>{tier}</strong> subscription needs attention.
      {expiresAt ? ` Access until ${new Date(expiresAt).toLocaleDateString()}.` : null}{' '}
      <Link href="/settings/billing" className="font-semibold text-[var(--color-text-primary)] underline underline-offset-2">
        Billing
      </Link>
    </div>
  );
}
