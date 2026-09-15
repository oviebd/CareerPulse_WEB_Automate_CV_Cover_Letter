'use client';

import Link from 'next/link';
import { UpgradePlans } from '@/components/billing/UpgradePlans';
import { useAuthStore } from '@/stores/useAuthStore';
import { TIER_LIMITS } from '@/types';

export default function PricingPage() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const free = TIER_LIMITS.free;
  const allowCheckout = initialized && Boolean(user);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">Simple pricing</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Billed in USD through Paddle. Start free — upgrade when you need Premium features.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="glass-panel rounded-card border border-[var(--color-border)] p-6 shadow-sm">
          <div className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">Free</div>
          <div className="mt-2 font-display text-3xl font-bold text-[var(--color-text-primary)]">$0</div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
            <li>Manual CV editing & PDF export</li>
            <li>Application tracker</li>
            <li>{free.generationsPerMonth} tailored applications / month</li>
            <li>ATS score visibility</li>
          </ul>
          <Link
            href={user ? '/dashboard' : '/register'}
            className="mt-6 inline-block rounded-btn border-2 border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          >
            {user ? 'Go to dashboard' : 'Get started'}
          </Link>
        </div>
        <div className="space-y-4">
          <UpgradePlans allowCheckout={allowCheckout} />
          {!allowCheckout && (
            <p className="text-sm text-[var(--color-muted)]">
              Create an account to subscribe, or manage billing later under Settings → Billing.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
