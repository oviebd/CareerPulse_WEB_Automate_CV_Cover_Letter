'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-fetch';
import { useToast } from '@/components/ui/toast';
import { useState } from 'react';

export function PastDueBanner({ canManageBilling }: { canManageBilling: boolean }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const result = await apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' });
      window.location.href = result.url;
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not open billing portal.', 'error');
      setLoading(false);
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Payment past due</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Your last payment failed. Update your payment method to keep Premium without interruption.
          </p>
        </div>
      </div>
      {canManageBilling && (
        <Button variant="secondary" size="sm" onClick={() => void openPortal()} loading={loading}>
          Update payment method
        </Button>
      )}
    </div>
  );
}
