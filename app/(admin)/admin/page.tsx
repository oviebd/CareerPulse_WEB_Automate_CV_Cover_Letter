'use client';

import { useQuery } from '@tanstack/react-query';
import { Coins, Sparkles, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminShell';

type DashboardStats = {
  total_users: number;
  free_users: number;
  premium_users: number;
  total_ai_requests: number;
  total_credits_consumed: number;
};

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/admin/dashboard'),
  });

  const stats = [
    { label: 'Total users', value: data?.total_users ?? 0, icon: Users },
    { label: 'Free users', value: data?.free_users ?? 0, icon: Users },
    { label: 'Premium users', value: data?.premium_users ?? 0, icon: Users },
    { label: 'AI requests', value: data?.total_ai_requests ?? 0, icon: Sparkles },
    { label: 'Credits consumed', value: data?.total_credits_consumed ?? 0, icon: Coins },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Overview"
        description="System-wide monetization and AI usage metrics."
      />
      {isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading dashboard…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <AdminStatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
          ))}
        </div>
      )}
    </div>
  );
}
