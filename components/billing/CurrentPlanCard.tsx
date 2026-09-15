'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api-fetch';
import { refreshCareerPulseSession } from '@/lib/auth/refresh-session';
import { formatDate } from '@/lib/utils';
import type { BillingSubscriptionDto } from '@/lib/paddle/types';
import type { Profile } from '@/types';

const PRO_FEATURES = [
  'Unlimited tailored applications',
  'AI enhancements & extras',
  'DOCX export',
  'ATS auto-fix',
  'Interview prep',
];

export function CurrentPlanCard({
  billing,
  profile,
}: {
  billing: BillingSubscriptionDto;
  profile: Profile | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState<'cancel' | 'portal' | 'monthly' | 'yearly' | null>(null);

  async function refresh() {
    await refreshCareerPulseSession();
    await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
    await queryClient.invalidateQueries({ queryKey: ['payments'] });
  }

  async function cancel() {
    setCancelOpen(false);
    setBusy('cancel');
    try {
      const result = await apiFetch<{ mode: string; currentPeriodEnd: string | null }>(
        '/api/billing/cancel',
        { method: 'POST' }
      );
      await refresh();
      if (result.mode === 'period_end') {
        toast('Your plan stays active until the end of the billing period.', 'info');
      } else {
        toast('Subscription cancelled. You have been moved to the free plan.', 'info');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to cancel subscription.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function portal() {
    setBusy('portal');
    try {
      const result = await apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' });
      window.location.href = result.url;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not open billing portal.', 'error');
      setBusy(null);
    }
  }

  async function changePlan(interval: 'monthly' | 'yearly') {
    setBusy(interval);
    try {
      await apiFetch('/api/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro', billingInterval: interval }),
      });
      await refresh();
      toast('Plan change requested. It will apply shortly.', 'info');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not change plan.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const periodEnd = billing.currentPeriodEnd;
  const oppositeInterval = billing.billingInterval === 'yearly' ? 'monthly' : 'yearly';

  return (
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
                <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">Premium Plan</h2>
                <span className="rounded-full bg-[var(--color-accent-gold)]/20 px-2.5 py-0.5 text-xs font-semibold capitalize text-[var(--color-accent-gold)]">
                  {billing.status}
                </span>
              </div>
              {periodEnd && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                  <Clock className="h-3 w-3" />
                  {billing.cancelAtPeriodEnd || billing.status === 'cancelled' ? 'Active until' : 'Renews'}{' '}
                  {formatDate(periodEnd)}
                </p>
              )}
              {billing.cancelAtPeriodEnd && periodEnd && (
                <p className="mt-1 text-xs text-[var(--color-muted)]">
                  Your subscription will remain active until {formatDate(periodEnd)}.
                </p>
              )}
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{profile?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCancelOpen(true)}
            disabled={busy === 'cancel' || billing.status === 'inactive'}
            className="shrink-0 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel plan'}
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRO_FEATURES.map((feat) => (
            <div key={feat} className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)]">
              <Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {billing.canManageBilling && (
            <Button variant="secondary" size="sm" onClick={() => void portal()} loading={busy === 'portal'}>
              Manage billing
            </Button>
          )}
          {billing.canChangePlan && oppositeInterval && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void changePlan(oppositeInterval)}
              loading={busy === oppositeInterval}
            >
              Switch to {oppositeInterval}
            </Button>
          )}
        </div>
      </div>
      <Modal isOpen={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Subscription?">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-muted)]">
            {billing.source === 'paddle'
              ? `Premium stays active until ${periodEnd ? formatDate(periodEnd) : 'the end of the billing period'}. You will not be charged again.`
              : 'Your plan will be downgraded to Free immediately. You will lose access to Premium features.'}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCancelOpen(false)}>
              Keep my plan
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => void cancel()}>
              Yes, cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
