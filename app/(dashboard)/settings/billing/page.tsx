'use client';

import { useEffect, useState } from 'react';
import { PRICING, type PricingPlanKey } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

export default function BillingPage() {
  const { tier, status, expiresAt, profile } = useSubscription();
  const [payments, setPayments] = useState<
    { id: string; plan: string; amount: number; status: string; created_at: string }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from('payments')
      .select('id, plan, amount, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setPayments((data ?? []) as typeof payments));
  }, []);

  async function pay(plan: PricingPlanKey) {
    const res = await fetch('/api/payment/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const j = await res.json();
    if (j.gatewayUrl) {
      window.location.href = j.gatewayUrl;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="font-display text-2xl font-bold">Billing</h1>
      <Card>
        <h2 className="font-semibold">Current plan</h2>
        <p className="mt-2 text-sm capitalize text-[var(--color-muted)]">
          {tier} · {status}
          {expiresAt ? ` · renews / ends ${formatDate(expiresAt)}` : ''}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{profile?.email}</p>
      </Card>
      <div>
        <h2 className="mb-4 font-display font-semibold">Upgrade</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(PRICING) as PricingPlanKey[]).map((key) => {
            const p = PRICING[key];
            return (
              <Card key={key} padding="sm">
                <div className="text-xs uppercase text-[var(--color-muted)]">{key}</div>
                <div className="text-xl font-bold">
                  ${p.amount}/{p.period === 'monthly' ? 'mo' : 'yr'}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void pay(key)}
                >
                  Pay with SSLCommerz
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
      <Card>
        <h2 className="font-semibold">Payment history</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
              <th className="py-2">Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="py-2">{formatDate(row.created_at)}</td>
                <td>{row.plan}</td>
                <td>${row.amount}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
