import Link from 'next/link';
import { PRICING, TIER_LIMITS } from '@/types';

export default function PricingPage() {
  const proMonthly = PRICING.pro_monthly;
  const proYearly = PRICING.pro_yearly;
  const free = TIER_LIMITS.free;
  const pro = TIER_LIMITS.pro;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
        Simple pricing
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Billed in USD via SSLCommerz. Start free — upgrade when you need unlimited tailored applications.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="glass-panel rounded-card border border-[var(--color-border)] p-6 shadow-sm">
          <div className="text-sm font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Free
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-[var(--color-text-primary)]">
            $0
          </div>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
            <li>Manual CV editing & PDF export</li>
            <li>Application tracker</li>
            <li>{free.generationsPerMonth} tailored applications / month</li>
            <li>ATS score visibility</li>
          </ul>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-btn border-2 border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          >
            Get started
          </Link>
        </div>
        <div className="glass-panel rounded-card border-2 border-[var(--color-primary-300)] p-6 shadow-md">
          <div className="text-sm font-medium uppercase tracking-wide text-[var(--color-primary-500)]">
            Pro
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-[var(--color-text-primary)]">
            ${proMonthly.amount}
            <span className="text-base font-normal text-[var(--color-muted)]">/mo</span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            or ${proYearly.amount}/year (save ~25%)
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--color-muted)]">
            <li>Unlimited tailored applications</li>
            <li>ATS auto-fix & cover letters</li>
            <li>Interview prep & follow-up emails</li>
            <li>DOCX export & all templates</li>
          </ul>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-btn bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Start Pro trial
          </Link>
        </div>
      </div>
      <p className="mt-10 text-sm text-[var(--color-muted)]">
        Manage subscription from the app under Settings → Billing after you sign in.
      </p>
    </main>
  );
}
