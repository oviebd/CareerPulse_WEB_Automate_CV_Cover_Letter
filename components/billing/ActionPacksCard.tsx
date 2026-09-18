'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { openPaddleCheckout } from '@/lib/paddle/browser';
import { CREDIT_PACKS, type CreditPackKey } from '@/lib/paddle/packs';
import { useToast } from '@/components/ui/toast';
import { invalidateCreditQueries } from '@/hooks/useCredits';

const PACK_ORDER: CreditPackKey[] = ['credits5', 'credits10'];

type CheckoutResponse = {
  priceId: string;
  email: string;
  customerId: string | null;
  customData: Record<string, unknown>;
};

async function waitForCreditBalance(previous: number, minIncrease: number): Promise<boolean> {
  for (let i = 0; i < 8; i += 1) {
    const { balance } = await apiFetch<{ balance: number }>('/api/user/credits');
    if (balance >= previous + minIncrease) return true;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

export function ActionPacksCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<CreditPackKey | null>(null);

  async function buy(pack: CreditPackKey) {
    setLoading(pack);
    try {
      const before = await apiFetch<{ balance: number }>('/api/user/credits');
      const payload = await apiFetch<CheckoutResponse>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ type: 'pack', pack }),
      });
      const result = await openPaddleCheckout({
        priceId: payload.priceId,
        email: payload.email,
        customerId: payload.customerId,
        customData: payload.customData,
      });
      if (result === 'closed') return;
      if (result === 'error') {
        toast('Checkout could not be completed. Please try again.', 'error');
        return;
      }
      toast('Payment received. Adding credits…', 'info');
      const granted = await waitForCreditBalance(before.balance, CREDIT_PACKS[pack].credits);
      invalidateCreditQueries(queryClient);
      if (granted) {
        toast('Credits added to your account.', 'success');
      } else {
        toast('Payment received. Credits will appear in a moment.', 'info');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Checkout failed.';
      toast(message, 'error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        Credit packs
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        One-time top-ups for AI features. No subscription change.
      </p>
      <ul className="mt-4 space-y-3">
        {PACK_ORDER.map((key) => {
          const pack = CREDIT_PACKS[key];
          return (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">{pack.label}</div>
                <div className="text-xs text-[var(--color-muted)]">${pack.priceUsd.toFixed(2)} one-time</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                loading={loading === key}
                onClick={() => void buy(key)}
              >
                Buy credits
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
