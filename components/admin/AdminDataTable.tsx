'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type AdminColumn<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export function AdminDataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  emptyMessage = 'No records found.',
  onRowClick,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  if (isLoading) {
    return (
      <Card className="overflow-hidden p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card className="p-8 text-center text-sm text-[var(--color-text-muted)]">{emptyMessage}</Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-faint)] text-left">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 font-medium text-[var(--color-text-muted)]', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-t border-[var(--color-border)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--color-hover-surface)]'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-[var(--color-text-primary)]', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
