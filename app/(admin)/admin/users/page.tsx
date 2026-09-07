'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Input } from '@/components/ui/input';

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  subscription_tier: string;
  balance: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debounced],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debounced.trim()) params.set('search', debounced.trim());
      const qs = params.toString();
      return apiFetch<{ users: AdminUser[] }>(`/api/admin/users${qs ? `?${qs}` : ''}`);
    },
  });

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDebounced(search);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Search accounts, review plans and credits, and manage permissions."
      />

      <form onSubmit={handleSearchSubmit} className="max-w-md">
        <Input
          placeholder="Search by email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </form>

      <AdminDataTable
        isLoading={isLoading}
        rows={data?.users ?? []}
        emptyMessage="No users match your search."
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
        columns={[
          {
            key: 'email',
            header: 'User',
            render: (u) => (
              <div>
                <p className="font-medium">{u.email}</p>
                {u.full_name ? (
                  <p className="text-xs text-[var(--color-text-muted)]">{u.full_name}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'plan',
            header: 'Plan',
            render: (u) => <StatusBadge status={u.subscription_tier} />,
          },
          {
            key: 'role',
            header: 'Role',
            render: (u) => <StatusBadge status={u.role} />,
          },
          {
            key: 'status',
            header: 'Account',
            render: (u) => <StatusBadge status={u.is_active !== false ? 'active' : 'inactive'} />,
          },
          {
            key: 'credits',
            header: 'Credits',
            render: (u) => u.balance.toLocaleString(),
          },
          {
            key: 'created',
            header: 'Joined',
            render: (u) => new Date(u.created_at).toLocaleDateString(),
          },
        ]}
      />
    </div>
  );
}
