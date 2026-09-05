'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bug } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiUsage } from '@/hooks/useAiUsage';
import { cn } from '@/lib/utils';

type Props = {
  collapsed?: boolean;
};

function formatNum(n: number) {
  return n.toLocaleString();
}

export function AiUsageDebugButton({ collapsed }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch, isFetching } = useAiUsage();

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const byCategory = useMemo(() => {
    const map = new Map<
      string,
      {
        input_tokens: number;
        output_tokens: number;
        operations: NonNullable<typeof data>['breakdown'];
      }
    >();
    for (const row of data?.breakdown ?? []) {
      const existing = map.get(row.category) ?? {
        input_tokens: 0,
        output_tokens: 0,
        operations: [],
      };
      existing.input_tokens += row.input_tokens;
      existing.output_tokens += row.output_tokens;
      existing.operations.push(row);
      map.set(row.category, existing);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data?.breakdown]);

  return (
    <>
      <button
        type="button"
        title={collapsed ? 'Debug — token usage' : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]',
          collapsed ? 'justify-center px-0' : 'pl-3 pr-3'
        )}
      >
        <Bug className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">Debug</span>}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="AI token usage">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Estimate: 1 token ≈ {data?.chars_per_token ?? 5} characters
            </p>
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Read (input)</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(data?.totals.input_tokens ?? 0)} tokens
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatNum(data?.totals.input_chars ?? 0)} chars
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Write (output)</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(data?.totals.output_tokens ?? 0)} tokens
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {formatNum(data?.totals.output_chars ?? 0)} chars
                  </p>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--color-surface)]">
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Read</th>
                      <th className="px-3 py-2 text-right">Write</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byCategory.map(([category, row]) => (
                      <tr key={category} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">{category}</td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatNum(row.input_tokens)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatNum(row.output_tokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {byCategory.length > 0 ? (
                <details className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">
                    By operation
                  </summary>
                  <ul className="mt-2 space-y-1 text-[var(--color-text-secondary)]">
                    {(data?.breakdown ?? []).map((row) => (
                      <li key={`${row.category}-${row.operation}`}>
                        {row.category} / {row.operation}: read {formatNum(row.input_tokens)}, write{' '}
                        {formatNum(row.output_tokens)} ({row.event_count} calls)
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
