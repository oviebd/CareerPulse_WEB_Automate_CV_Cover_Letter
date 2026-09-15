'use client';

import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-fetch';
import { cn, formatDate } from '@/lib/utils';

type Payment = { id: string; plan: string; amount: number; status: string; created_at: string };

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  pending: 'bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]',
  failed: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
  cancelled: 'bg-[var(--color-hover-surface)] text-[var(--color-muted)]',
  refunded: 'bg-[var(--color-hover-surface)] text-[var(--color-muted)]',
};

function formatPlanName(plan: string) {
  return plan.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PaymentHistory() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => apiFetch<Payment[]>('/api/payments'),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card>
      <h2 className="font-semibold">Payment History</h2>
      {isLoading ? (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 py-10 text-center">
          <CreditCard className="h-8 w-8 text-[var(--color-muted)]" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">No payments yet</p>
          <p className="text-xs text-[var(--color-muted)]">
            Your payment history will appear here after your first purchase.
          </p>
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
                      STATUS_STYLES[row.status] ?? 'bg-[var(--color-hover-surface)] text-[var(--color-muted)]'
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
  );
}
