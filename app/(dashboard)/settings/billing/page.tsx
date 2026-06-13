'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, CreditCard, Sparkles, X } from 'lucide-react';
import { PRICING, type PricingPlanKey, TIER_LIMITS } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

type Payment = { id: string; plan: string; amount: number; status: string; created_at: string };

const PRO_PLANS: PricingPlanKey[] = ['pro_monthly', 'pro_yearly'];

const PRO_FEATURES = [
  'Unlimited tailored applications',
  'AI enhancements & extras',
  'DOCX export',
  'ATS auto-fix',
  'Interview prep',
];

const FREE_FEATURES = [
  { label: 'Job tracker', included: true },
  { label: 'ATS score checker', included: true },
  { label: 'Unlimited applications', included: false },
  { label: 'AI enhancements', included: false },
  { label: 'DOCX export', included: false },
];

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  refunded: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function formatPlanName(plan: string) {
  return plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BillingPage() {
  const { tier, status, expiresAt, profile } = useSubscription();
  const limits = TIER_LIMITS[tier];
  const setProfile = useAuthStore((s) => s.setProfile);
  const { toast } = useToast();

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: async (): Promise<Payment[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('payments')
        .select('id, plan, amount, status, created_at')
        .order('created_at', { ascending: false });
      return (data ?? []) as Payment[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [showPromoSuccess, setShowPromoSuccess] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  async function pay(plan: PricingPlanKey) {
    const res = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      toast('Payment initiation failed. Please try again.', 'error');
      return;
    }
    const j = await res.json();
    if (j.gatewayUrl) window.location.href = j.gatewayUrl;
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch('/api/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode }),
      });
      const j = await res.json() as { ok?: boolean; error?: string; expiresAt?: string };
      if (!res.ok || !j.ok) {
        setPromoError(j.error ?? 'Invalid promo code.');
        return;
      }
      if (profile) {
        setProfile({
          ...profile,
          subscription_tier: 'pro',
          subscription_status: 'active',
          subscription_expires_at: j.expiresAt ?? null,
          promo_code_used: '2468',
        } as Profile);
      }
      setPromoCode('');
      setShowPromo(false);
      setShowPromoSuccess(true);
    } catch {
      setPromoError('Something went wrong. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }

  async function cancelSubscription() {
    setShowCancelConfirm(false);
    setCancelLoading(true);
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const j = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        toast(j.error ?? 'Failed to cancel subscription.', 'error');
        return;
      }
      if (profile) {
        setProfile({
          ...profile,
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_expires_at: null,
        } as Profile);
      }
      toast('Subscription cancelled. You have been moved to the free plan.', 'info');
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Manage your plan and payment details.</p>
      </div>

      {/* Current plan — Pro */}
      {tier === 'pro' ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-primary-500)]/30 bg-gradient-to-br from-[var(--color-primary-500)]/10 via-[var(--color-surface)] to-[var(--color-accent-mint)]/10 p-6 shadow-sm">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 -translate-y-12 translate-x-12 rounded-full bg-[var(--color-primary-500)]/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] shadow-md">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">Pro Plan</h2>
                    <span className="rounded-full bg-[var(--color-accent-gold)]/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-[var(--color-accent-gold)]">
                      {status}
                    </span>
                  </div>
                  {expiresAt && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                      <Clock className="h-3 w-3" />
                      {status === 'cancelled' ? 'Expires' : 'Renews'} {formatDate(expiresAt)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">{profile?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelLoading}
                className="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              >
                {cancelLoading ? 'Cancelling…' : 'Cancel plan'}
              </Button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRO_FEATURES.map((feat) => (
                <div key={feat} className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)]">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Current plan — Free */
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
                {limits.generationsPerMonth} tailored applications / month · {profile?.email}
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
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <X className="h-4 w-4 shrink-0" />
                )}
                <span>{feat.label}</span>
                {!feat.included && (
                  <span className="rounded bg-[var(--color-accent-gold)]/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-accent-gold)]">
                    Pro
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upgrade section — free users only */}
      {tier === 'free' && (
        <div>
          <h2 className="mb-4 font-display text-lg font-semibold">Upgrade to Pro</h2>
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
                    <span className="absolute right-4 top-4 rounded-full bg-[var(--color-accent-gold)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Best value
                    </span>
                  )}
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    {isYearly ? 'Yearly' : 'Monthly'}
                  </div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
                      ${p.amount}
                    </span>
                    <span className="mb-1 text-sm text-[var(--color-muted)]">/{isYearly ? 'yr' : 'mo'}</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">~$7.50/mo · Save 25%</p>
                  )}
                  <div className="mt-4 space-y-1.5">
                    {PRO_FEATURES.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant={isYearly ? 'primary' : 'secondary'}
                    size="sm"
                    className="mt-5 w-full"
                    onClick={() => void pay(key)}
                  >
                    Pay with SSLCommerz
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Promo code */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Promo Code</h2>
          {!showPromo && (
            <button
              type="button"
              onClick={() => { setShowPromo(true); setPromoError(''); }}
              className="text-sm text-[var(--color-primary-500)] transition hover:underline"
            >
              Have a promo code?
            </button>
          )}
        </div>
        {showPromo && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void applyPromo(); }}
                placeholder="Enter promo code"
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={promoLoading}
                autoFocus
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => void applyPromo()}
                disabled={promoLoading || !promoCode.trim()}
              >
                {promoLoading ? 'Applying…' : 'Apply'}
              </Button>
            </div>
            {promoError && (
              <p className="text-sm text-red-600 dark:text-red-400">{promoError}</p>
            )}
          </div>
        )}
      </Card>

      {/* Payment history */}
      <Card>
        <h2 className="font-semibold">Payment History</h2>
        {payments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 py-10 text-center">
            <CreditCard className="h-8 w-8 text-[var(--color-muted)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">No payments yet</p>
            <p className="text-xs text-[var(--color-muted)]">Your payment history will appear here after your first purchase.</p>
          </div>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="py-2 font-medium">Date</th>
                <th className="font-medium">Plan</th>
                <th className="font-medium">Amount</th>
                <th className="font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-2.5">{formatDate(row.created_at)}</td>
                  <td>{formatPlanName(row.plan)}</td>
                  <td>${row.amount}</td>
                  <td>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        STATUS_STYLES[row.status] ?? 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Promo success modal */}
      <Modal
        isOpen={showPromoSuccess}
        onClose={() => setShowPromoSuccess(false)}
        title="You're now Pro!"
      >
        <div className="space-y-4 text-center">
          <div className="text-5xl">🎉</div>
          <p className="text-[var(--color-text-primary)]">
            Promo code applied successfully. Pro access activated for 30 days.
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            You now have unlimited tailored applications, premium CV templates, AI
            enhancements, DOCX export, and all Pro features.
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowPromoSuccess(false)}
          >
            Start using Pro
          </Button>
        </div>
      </Modal>

      {/* Cancel subscription confirmation */}
      <Modal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Cancel Subscription?"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            Your plan will be downgraded to Free immediately. You will lose access to
            unlimited applications, AI enhancements, DOCX export, and all Pro features.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCancelConfirm(false)}
            >
              Keep my plan
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => void cancelSubscription()}
            >
              Yes, cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
