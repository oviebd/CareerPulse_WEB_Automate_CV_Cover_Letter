'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

const LABELS: Record<string, { label: string; variant: StatusVariant }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'danger' },
  free: { label: 'Free', variant: 'default' },
  pro: { label: 'Premium', variant: 'info' },
  user: { label: 'User', variant: 'default' },
  super_admin: { label: 'Super Admin', variant: 'warning' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  const config = LABELS[normalized] ?? { label: status, variant: 'default' as StatusVariant };
  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
}

export function BoolBadge({ value, trueLabel, falseLabel }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <Badge variant={value ? 'success' : 'danger'}>
      {value ? (trueLabel ?? 'Yes') : (falseLabel ?? 'No')}
    </Badge>
  );
}
