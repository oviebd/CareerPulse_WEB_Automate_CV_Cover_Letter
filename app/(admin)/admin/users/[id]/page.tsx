'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ToggleRow } from '@/components/admin/ToggleRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatCredits } from '@/lib/credits/calculator';

type AdminUserDetail = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  promo_code_used: string | null;
  can_use_ai: boolean;
  can_create_documents: boolean;
  can_use_interview_prep: boolean;
  balance: number;
};

type AiUsageRow = {
  id: string;
  feature: string | null;
  category: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  credits_consumed: number;
  created_at: string;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('50');
  const [note, setNote] = useState('Admin grant');
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [role, setRole] = useState<'user' | 'super_admin'>('user');
  const [isActive, setIsActive] = useState(true);
  const [canUseAi, setCanUseAi] = useState(true);
  const [canCreateDocuments, setCanCreateDocuments] = useState(true);
  const [canUseInterviewPrep, setCanUseInterviewPrep] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user', params.id],
    queryFn: () =>
      apiFetch<{ user: AdminUserDetail; transactions: Array<Record<string, unknown>> }>(
        `/api/admin/users/${params.id}`
      ),
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['admin-user-ai-usage', params.id],
    queryFn: () =>
      apiFetch<{ usage: AiUsageRow[] }>(`/api/admin/ai-usage?userId=${params.id}&limit=30`),
  });

  useEffect(() => {
    if (!data?.user) return;
    const u = data.user;
    setPlan(u.subscription_tier === 'pro' ? 'pro' : 'free');
    setRole(u.role === 'super_admin' ? 'super_admin' : 'user');
    setIsActive(u.is_active !== false);
    setCanUseAi(u.can_use_ai !== false);
    setCanCreateDocuments(u.can_create_documents !== false);
    setCanUseInterviewPrep(u.can_use_interview_prep !== false);
  }, [data?.user]);

  async function adjustCredits() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${params.id}/credits/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), description: note }),
      });
      await qc.invalidateQueries({ queryKey: ['admin-user', params.id] });
      setMessage('Credits updated.');
    } catch {
      setMessage('Failed to adjust credits.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: plan,
          subscription_status: plan === 'pro' ? 'active' : 'inactive',
          role,
          is_active: isActive,
          can_use_ai: canUseAi,
          can_create_documents: canCreateDocuments,
          can_use_interview_prep: canUseInterviewPrep,
        }),
      });
      await qc.invalidateQueries({ queryKey: ['admin-user', params.id] });
      setMessage('User settings saved.');
    } catch {
      setMessage('Failed to save user settings.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !data?.user) {
    return <p className="text-sm text-[var(--color-text-muted)]">Loading user…</p>;
  }

  const user = data.user;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <AdminPageHeader
        title={user.full_name || user.email}
        description={user.full_name ? user.email : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={user.is_active !== false ? 'active' : 'inactive'} />
            <StatusBadge status={user.subscription_tier} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Credits</p>
          <p className="mt-1 text-xl font-semibold">{formatCredits(user.balance)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Joined</p>
          <p className="mt-1 text-sm font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Promo used</p>
          <p className="mt-1 text-sm font-medium">{user.promo_code_used ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Role</p>
          <p className="mt-1 text-sm font-medium capitalize">{user.role.replace('_', ' ')}</p>
        </Card>
      </div>

      {message ? (
        <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-4 py-2 text-sm text-[var(--color-text-secondary)]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Account</h3>
          <ToggleRow
            label="Account active"
            description="Inactive users cannot sign in or use the API."
            checked={isActive}
            onChange={setIsActive}
          />
          <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <h4 className="text-sm font-medium text-[var(--color-text-primary)]">Permissions</h4>
            <ToggleRow
              label="AI usage"
              description="Allow AI generation and billed API calls."
              checked={canUseAi}
              onChange={setCanUseAi}
            />
            <ToggleRow
              label="CV & cover letter"
              description="Allow creating and editing documents."
              checked={canCreateDocuments}
              onChange={setCanCreateDocuments}
            />
            <ToggleRow
              label="Interview preparation"
              description="Allow interview prep features."
              checked={canUseInterviewPrep}
              onChange={setCanUseInterviewPrep}
            />
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Plan & role</h3>
          <Select
            label="Subscription plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as 'free' | 'pro')}
            options={[
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Premium' },
            ]}
          />
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'user' | 'super_admin')}
            options={[
              { value: 'user', label: 'User' },
              { value: 'super_admin', label: 'Super Admin' },
            ]}
          />
          <Button onClick={saveProfile} disabled={saving} className="w-full">
            Save account settings
          </Button>
        </Card>

        <Card className="space-y-4 p-5 lg:col-span-2">
          <h3 className="font-semibold text-[var(--color-text-primary)]">Adjust credits</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={adjustCredits} disabled={saving} variant="secondary">
            Apply adjustment
          </Button>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--color-text-primary)]">API usage</h3>
        <AdminDataTable
          isLoading={usageLoading}
          rows={usageData?.usage ?? []}
          emptyMessage="No API usage recorded for this user."
          columns={[
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
              render: (r) => formatCredits(Number(r.credits_consumed)),
            },
            {
              key: 'when',
              header: 'When',
              render: (r) => new Date(r.created_at).toLocaleString(),
            },
          ]}
        />
      </div>

      <Card className="p-5">
        <h3 className="mb-4 font-semibold text-[var(--color-text-primary)]">Recent transactions</h3>
        <div className="space-y-2 text-sm">
          {(data.transactions ?? []).length === 0 ? (
            <p className="text-[var(--color-text-muted)]">No transactions yet.</p>
          ) : (
            (data.transactions ?? []).map((t) => (
              <div
                key={String(t.id)}
                className="flex justify-between border-b border-[var(--color-border)] py-2 last:border-0"
              >
                <span className="text-[var(--color-text-secondary)]">
                  {String(t.type)} · {String(t.description ?? '')}
                </span>
                <span className="font-medium">{formatCredits(Number(t.amount))}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
