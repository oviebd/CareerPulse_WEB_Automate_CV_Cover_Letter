'use client';

import { Check, CreditCard, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CheckoutButton } from '@/components/billing/CheckoutButton';
import { cn } from '@/lib/utils';
import { PRICING, type PricingPlanKey } from '@/types';

const PRO_PLANS: PricingPlanKey[] = ['pro_monthly', 'pro_yearly'];

const PRO_FEATURES = [
  '700 AI credits refreshed each billing month',
  'Unlimited AI within your credit balance',
  'PDF & DOCX export',
  'Interview prep',
  'ATS auto-fix',
];

const FREE_FEATURES = [
  { label: 'Job tracker & ATS checker', included: true },
  { label: '50 welcome AI credits', included: true },
  { label: 'AI features (credit-gated)', included: true },
  { label: 'PDF/DOCX export', included: false },
  { label: 'Interview prep', included: false },
];

export function FreePlanCard({ email }: { email?: string | null }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-hover-surface)]">
          <CreditCard className="h-5 w-5 text-[var(--color-muted)]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">Free Plan</h2>
            <span className="rounded-full bg-[var(--color-hover-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-muted)]">
              Current
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            Welcome credits · pay-as-you-go with credit packs · {email}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FREE_FEATURES.map((feat) => (
          <div
            key={feat.label}
            className={cn(
              'flex items-center gap-1.5 text-sm',
              feat.included ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-muted)]'
            )}
          >
            {feat.included ? (
              <Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
            ) : (
              <X className="h-4 w-4 shrink-0" />
            )}
            <span>{feat.label}</span>
            {!feat.included && (
              <span className="rounded bg-[var(--color-accent-gold)]/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-accent-gold)]">
                Premium
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function UpgradePlans({ allowCheckout }: { allowCheckout: boolean }) {
  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-semibold">Upgrade to Premium</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {PRO_PLANS.map((key) => {
          const p = PRICING[key];
          const isYearly = p.period === 'yearly';
          return (
            <div
              key={key}
              className={cn(
                'relative overflow-hidden rounded-xl border p-5 transition-shadow hover:shadow-md',
                isYearly
                  ? 'border-[var(--color-primary-500)]/40 bg-gradient-to-br from-[var(--color-primary-500)]/8 to-[var(--color-surface)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              )}
            >
              {isYearly && (
                <span className="absolute right-4 top-4 rounded-full bg-[var(--color-accent-gold)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                  Best value
                </span>
              )}
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                {isYearly ? 'Yearly' : 'Monthly'}
              </div>
              <div className="mt-1 flex items-end gap-1">
                <span className="font-display text-3xl font-bold text-[var(--color-text-primary)]">${p.amount}</span>
                <span className="mb-1 text-sm text-[var(--color-muted)]">/{isYearly ? 'yr' : 'mo'}</span>
              </div>
              {isYearly && (
                <p className="text-xs text-[var(--color-success)]">~$6.67/mo · Save vs monthly</p>
              )}
              <div className="mt-4 space-y-1.5">
                {PRO_FEATURES.map((feat) => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              {allowCheckout ? (
                <CheckoutButton
                  interval={p.period}
                  variant={isYearly ? 'primary' : 'secondary'}
                  label={isYearly ? 'Subscribe yearly' : 'Subscribe monthly'}
                />
              ) : (
                <a
                  href="/register"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-btn bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary,white)]"
                >
                  Start Pro
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
