'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Input } from '@/components/ui/input';

type AiUsageRow = {
  id: string;
  user_email: string;
  feature: string | null;
  category: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  credits_consumed: number;
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
      return apiFetch<{ usage: AiUsageRow[] }>(`/api/admin/ai-usage?${params}`);
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="AI usage"
        description="Recent API calls across all users. Filter by user ID from the user detail page."
      />

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
            key: 'credits',
            header: 'Credits',
            render: (r) => r.credits_consumed,
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
