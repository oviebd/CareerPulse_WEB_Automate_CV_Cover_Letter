'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export default function AdminPlansPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => apiFetch<Plan[]>('/api/admin/plans'),
  });

  const patchPlan = useMutation({
    mutationFn: (input: { id: string; patch: Partial<Plan> }) =>
      apiFetch(`/api/admin/plans/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Plans"
        description="Display names and availability for subscription tiers."
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((plan) => (
            <Card key={plan.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      {plan.slug}
                    </p>
                    <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {plan.name}
                  </p>
                  {plan.description ? (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">{plan.description}</p>
                  ) : null}
                </div>
                <Button
                  variant={plan.is_active ? 'secondary' : 'primary'}
                  disabled={patchPlan.isPending}
                  onClick={() =>
                    patchPlan.mutate({ id: plan.id, patch: { is_active: !plan.is_active } })
                  }
                >
                  {plan.is_active ? 'Deactivate tier' : 'Activate tier'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
