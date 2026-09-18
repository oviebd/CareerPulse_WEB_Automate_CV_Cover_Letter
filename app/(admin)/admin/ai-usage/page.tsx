'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Input } from '@/components/ui/input';
import { formatCredits } from '@/lib/credits/calculator';

type AiUsageRow = {
  id: string;
  user_email: string;
  feature: string | null;
  category: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  input_chars: number;
  output_chars: number;
  credits_consumed: number;
  usd_cost: number;
  created_at: string;
};

export default function AdminAiUsagePage() {
  const [userFilter, setUserFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-usage', appliedFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (appliedFilter.trim()) params.set('userId', appliedFilter.trim());
      return apiFetch<{
        usage: AiUsageRow[];
        token_stats?: {
          by_source: Record<string, number>;
          estimated_last_24h: number;
        };
      }>(`/api/admin/ai-usage?${params}`);
    },
  });

  const estimatedRecent = data?.token_stats?.estimated_last_24h ?? 0;
  const bySource = data?.token_stats?.by_source ?? {};

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI usage"
        description="Recent API calls across all users. Filter by user ID from the user detail page."
      />

      {estimatedRecent > 0 ? (
        <div
          className="rounded-lg border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          <strong>{estimatedRecent}</strong> event(s) in the last 24 hours used estimated tokens
          instead of Anthropic API usage. Investigate billing or gateway errors.
        </div>
      ) : null}

      {Object.keys(bySource).length > 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Token source (all time):{' '}
          {Object.entries(bySource)
            .map(([k, v]) => `${k}: ${v.toLocaleString()}`)
            .join(' · ')}
        </p>
      ) : null}

      <form
        className="max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedFilter(userFilter);
        }}
      >
        <Input
          label="Filter by user ID"
          placeholder="Paste user UUID…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
        />
      </form>

      <AdminDataTable
        isLoading={isLoading}
        rows={data?.usage ?? []}
        emptyMessage="No AI usage events found."
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (r) => r.user_email,
          },
          {
            key: 'feature',
            header: 'Feature',
            render: (r) => r.feature ?? r.category,
          },
          {
            key: 'model',
            header: 'Model',
            render: (r) => r.model ?? '—',
          },
          {
            key: 'tokens',
            header: 'Tokens in/out',
            render: (r) => `${r.input_tokens}/${r.output_tokens}`,
          },
          {
            key: 'chars',
            header: 'Chars in/out',
            render: (r) => `${r.input_chars}/${r.output_chars}`,
          },
          {
            key: 'credits',
            header: 'Credits',
            render: (r) => formatCredits(Number(r.credits_consumed)),
          },
          {
            key: 'usd',
            header: 'USD',
            render: (r) =>
              new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 4,
              }).format(Number(r.usd_cost ?? 0)),
          },
          {
            key: 'when',
            header: 'When',
            render: (r) => new Date(r.created_at).toLocaleString(),
          },
        ]}
      />
    </div>
  );
}
