'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { refreshCareerPulseSession } from '@/lib/auth/refresh-session';
import { hasPremiumAccess } from '@/lib/access/premium';
import { openPaddleCheckout } from '@/lib/paddle/browser';
import { paddleLog } from '@/lib/paddle/log';
import { useToast } from '@/components/ui/toast';
import { invalidateCreditQueries } from '@/hooks/useCredits';
import type { BillingInterval } from '@/lib/paddle/plans';

type CheckoutResponse = {
  priceId: string;
  email: string;
  customerId: string | null;
  customData: Record<string, unknown>;
};

async function waitForActivation(): Promise<boolean> {
  for (let i = 0; i < 8; i += 1) {
    const profile = await refreshCareerPulseSession();
    if (hasPremiumAccess(profile)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return false;
}

export function CheckoutButton({
  interval,
  variant = 'primary',
  label,
}: {
  interval: BillingInterval;
  variant?: 'primary' | 'secondary';
  label: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const payload = await apiFetch<CheckoutResponse>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'pro', billingInterval: interval }),
      });
      paddleLog('checkout_started', { plan: `pro_${interval}` });
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
      toast('Payment received. Activating your plan…', 'info');
      const activated = await waitForActivation();
      await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await invalidateCreditQueries(queryClient);
      if (activated) {
        toast('Premium is now active.', 'success');
      } else {
        toast('Payment received. Premium will activate in a moment.', 'info');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed. Please try again.';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size="sm" className="mt-5 w-full" onClick={() => void start()} loading={loading}>
      {label}
    </Button>
  );
}
