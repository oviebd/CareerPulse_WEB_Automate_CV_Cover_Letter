'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { BoolBadge, StatusBadge } from '@/components/admin/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import type { PromoCode } from '@/types';

type PromoForm = {
  code: string;
  grantPro: 'yes' | 'no';
  bonus_credits: string;
  max_redemptions: string;
  expires_at: string;
  is_active: boolean;
};

const EMPTY_FORM: PromoForm = {
  code: '',
  grantPro: 'yes',
  bonus_credits: '0',
  max_redemptions: '',
  expires_at: '',
  is_active: true,
};

function toPayload(form: PromoForm) {
  return {
    code: form.code.trim(),
    grants_plan: form.grantPro === 'yes' ? 'pro' : null,
    bonus_credits: Number(form.bonus_credits) || 0,
    max_redemptions: form.max_redemptions.trim() ? Number(form.max_redemptions) : null,
    expires_at: form.expires_at.trim() ? new Date(form.expires_at).toISOString() : null,
    is_active: form.is_active,
  };
}

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: () => apiFetch<PromoCode[]>('/api/admin/promo-codes'),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(promo: PromoCode) {
    setEditing(promo);
    setForm({
      code: promo.code,
      grantPro: promo.grants_plan ? 'yes' : 'no',
      bonus_credits: String(promo.bonus_credits),
      max_redemptions: promo.max_redemptions != null ? String(promo.max_redemptions) : '',
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : '',
      is_active: promo.is_active,
    });
    setError(null);
    setModalOpen(true);
  }

  async function savePromo() {
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (!payload.code) {
        setError('Code is required.');
        return;
      }
      if (editing) {
        const { code: _code, ...patch } = payload;
        await apiFetch(`/api/admin/promo-codes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } else {
        await apiFetch('/api/admin/promo-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });
      setModalOpen(false);
    } catch {
      setError('Failed to save promo code.');
    } finally {
      setSaving(false);
    }
  }

  async function deletePromo(promo: PromoCode) {
    if (!confirm(`Delete promo code "${promo.code}"? This cannot be undone.`)) return;
    await apiFetch(`/api/admin/promo-codes/${promo.id}`, { method: 'DELETE' });
    await qc.invalidateQueries({ queryKey: ['admin-promo-codes'] });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promo codes"
        description="Create codes that grant bonus credits, Premium access, or both."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New promo code
          </Button>
        }
      />

      <AdminDataTable
        isLoading={isLoading}
        rows={data ?? []}
        emptyMessage="No promo codes yet. Create one to get started."
        columns={[
          {
            key: 'code',
            header: 'Code',
            render: (p) => <span className="font-mono font-medium">{p.code}</span>,
          },
          {
            key: 'plan',
            header: 'Grants Pro',
            render: (p) => <BoolBadge value={Boolean(p.grants_plan)} trueLabel="Yes" falseLabel="No" />,
          },
          {
            key: 'bonus',
            header: 'Bonus credits',
            render: (p) => p.bonus_credits.toLocaleString(),
          },
          {
            key: 'redemptions',
            header: 'Redemptions',
            render: (p) =>
              `${p.redemption_count}${p.max_redemptions != null ? ` / ${p.max_redemptions}` : ''}`,
          },
          {
            key: 'expires',
            header: 'Expires',
            render: (p) => (p.expires_at ? new Date(p.expires_at).toLocaleDateString() : '—'),
          },
          {
            key: 'active',
            header: 'Status',
            render: (p) => <StatusBadge status={p.is_active ? 'active' : 'inactive'} />,
          },
          {
            key: 'actions',
            header: '',
            className: 'w-28',
            render: (p) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deletePromo(p)} aria-label="Delete">
                  <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit promo code' : 'Create promo code'}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Code"
            value={form.code}
            disabled={Boolean(editing)}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="SUMMER2026"
          />
          <Select
            label="Grant Premium (Pro)"
            value={form.grantPro}
            onChange={(e) => setForm({ ...form, grantPro: e.target.value as 'yes' | 'no' })}
            options={[
              { value: 'yes', label: 'Yes — upgrade to Premium' },
              { value: 'no', label: 'No — credits only' },
            ]}
          />
          <Input
            label="Bonus credits"
            type="number"
            min={0}
            value={form.bonus_credits}
            onChange={(e) => setForm({ ...form, bonus_credits: e.target.value })}
          />
          <Input
            label="Max redemptions (optional)"
            type="number"
            min={1}
            value={form.max_redemptions}
            onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })}
            placeholder="Unlimited"
          />
          <Input
            label="Expires at (optional)"
            type="datetime-local"
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Active
          </label>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePromo} disabled={saving}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
