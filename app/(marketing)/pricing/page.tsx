import Link from 'next/link';
import { PRICING } from '@/types';

export default function PricingPage() {
  const plans = Object.entries(PRICING);
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">Pricing</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Billed in USD via SSLCommerz. All plans include core CV and cover letter
        features; limits scale with tier.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map(([key, p]) => (
          <div
            key={key}
            className="glass-panel rounded-card border border-[var(--color-border)] p-6 shadow-sm"
          >
            <div className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
              {key.replace(/_/g, ' ')}
            </div>
            <div className="mt-2 font-display text-3xl font-bold text-[var(--color-text-primary)]">
              ${p.amount}
              <span className="text-base font-normal text-[var(--color-muted)]">
                /{p.period === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            <p className="mt-2 text-sm capitalize text-[var(--color-muted)]">
              Tier: {p.tier}
            </p>
            <Link
              href="/register"
              className="mt-6 inline-block rounded-btn bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Start trial
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-10 text-sm text-[var(--color-muted)]">
        Manage subscription from the app under Settings → Billing after you sign
        in.
      </p>
    </main>
  );
}
