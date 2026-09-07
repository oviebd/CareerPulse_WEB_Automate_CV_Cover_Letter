'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-fetch';
import { Card } from '@/components/ui/card';
import type { CreditTransaction } from '@/types';

export default function CreditsSettingsPage() {
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => apiFetch<{ balance: number; rule: Record<string, number> }>('/api/user/credits'),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['user-credit-transactions'],
    queryFn: () =>
      apiFetch<{ transactions: CreditTransaction[] }>('/api/user/credits/transactions?limit=30'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">AI Credits</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          AI features consume credits based on token usage. Need Premium templates?{' '}
          <Link href="/settings/billing" className="text-[var(--color-primary)] hover:underline">
            Upgrade or apply a promo code
          </Link>
          .
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-[var(--color-text-muted)]">Available credits</p>
        <p className="mt-2 text-4xl font-semibold text-[var(--color-text-primary)]">
          {creditsLoading ? '…' : (credits?.balance ?? 0).toLocaleString()}
        </p>
        {!creditsLoading && credits?.rule && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            ~{credits.rule.input_token_credits} credit per {credits.rule.input_token_unit} input
            tokens · ~{credits.rule.output_token_credits} credits per{' '}
            {credits.rule.output_token_unit} output tokens
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold">Recent usage</h2>
        {txLoading ? (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            {(txData?.transactions ?? []).length === 0 ? (
              <p className="text-[var(--color-text-muted)]">No credit activity yet.</p>
            ) : (
              txData?.transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] py-2"
                >
                  <div>
                    <p className="font-medium capitalize">{t.type.replace(/_/g, ' ')}</p>
                    <p className="text-[var(--color-text-muted)]">{t.description ?? '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className={t.amount >= 0 ? 'text-emerald-600' : 'text-[var(--color-text-primary)]'}>
                      {t.amount >= 0 ? '+' : ''}
                      {t.amount}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Bal {t.balance_after}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
