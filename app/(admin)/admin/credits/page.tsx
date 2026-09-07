'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type CreditSettings = {
  initial_free_credits: number;
  active_rule: {
    input_token_unit: number;
    input_token_credits: number;
    output_token_unit: number;
    output_token_credits: number;
  };
};

export default function AdminCreditsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-credit-settings'],
    queryFn: () => apiFetch<CreditSettings>('/api/admin/settings/credits'),
  });

  const [form, setForm] = useState<CreditSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const current = form ?? data;

  async function save() {
    if (!current) return;
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch('/api/admin/settings/credits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_free_credits: current.initial_free_credits,
          ...current.active_rule,
        }),
      });
      await qc.invalidateQueries({ queryKey: ['admin-credit-settings'] });
      setMessage('Credit configuration saved.');
    } catch {
      setMessage('Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Credit configuration"
        description="Token-to-credit rules apply to future AI requests. Historical usage keeps its snapshot."
      />

      {isLoading || !current ? (
        <Card className="max-w-xl space-y-4 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : (
        <Card className="max-w-xl space-y-4 p-5">
          <Input
            label="Initial free credits (new registrations)"
            type="number"
            value={current.initial_free_credits}
            onChange={(e) =>
              setForm({
                ...current,
                initial_free_credits: Number(e.target.value),
              })
            }
          />
          <Input
            label="Input token unit"
            type="number"
            value={current.active_rule.input_token_unit}
            onChange={(e) =>
              setForm({
                ...current,
                active_rule: {
                  ...current.active_rule,
                  input_token_unit: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Input token credits"
            type="number"
            value={current.active_rule.input_token_credits}
            onChange={(e) =>
              setForm({
                ...current,
                active_rule: {
                  ...current.active_rule,
                  input_token_credits: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Output token unit"
            type="number"
            value={current.active_rule.output_token_unit}
            onChange={(e) =>
              setForm({
                ...current,
                active_rule: {
                  ...current.active_rule,
                  output_token_unit: Number(e.target.value),
                },
              })
            }
          />
          <Input
            label="Output token credits"
            type="number"
            value={current.active_rule.output_token_credits}
            onChange={(e) =>
              setForm({
                ...current,
                active_rule: {
                  ...current.active_rule,
                  output_token_credits: Number(e.target.value),
                },
              })
            }
          />
          {message ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
          ) : null}
          <Button onClick={save} disabled={saving}>
            Save configuration
          </Button>
        </Card>
      )}
    </div>
  );
}
