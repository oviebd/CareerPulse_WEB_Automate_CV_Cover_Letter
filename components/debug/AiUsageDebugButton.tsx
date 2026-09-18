'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiUsage, type AiUsageRecentRow } from '@/hooks/useAiUsage';
import { formatCredits } from '@/lib/credits/calculator';
import { cn } from '@/lib/utils';

type Props = {
  collapsed?: boolean;
};

function formatNum(n: number) {
  return n.toLocaleString();
}

function formatUsd(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function toNum(v: number | string | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function recentLabel(row: AiUsageRecentRow) {
  const op = row.operation ? `${row.category}/${row.operation}` : row.category ?? 'call';
  const inTok = formatNum(row.input_tokens ?? 0);
  const outTok = formatNum(row.output_tokens ?? 0);
  const inCh = formatNum(row.input_chars ?? 0);
  const outCh = formatNum(row.output_chars ?? 0);
  const credits = formatCredits(toNum(row.credits_consumed));
  const cost = formatUsd(toNum(row.usd_cost));
  return `${op}: ${inTok}/${outTok} tok · ${inCh}/${outCh} ch · ${credits} cr · ${cost}`;
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
        input_chars: number;
        output_chars: number;
        credits_consumed: number;
        usd_cost: number;
        operations: NonNullable<typeof data>['breakdown'];
      }
    >();
    for (const row of data?.breakdown ?? []) {
      const existing = map.get(row.category) ?? {
        input_tokens: 0,
        output_tokens: 0,
        input_chars: 0,
        output_chars: 0,
        credits_consumed: 0,
        usd_cost: 0,
        operations: [],
      };
      existing.input_tokens += row.input_tokens;
      existing.output_tokens += row.output_tokens;
      existing.input_chars += row.input_chars;
      existing.output_chars += row.output_chars;
      existing.credits_consumed += row.credits_consumed ?? 0;
      existing.usd_cost += row.usd_cost ?? 0;
      existing.operations.push(row);
      map.set(row.category, existing);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data?.breakdown]);

  const totals = data?.totals;

  return (
    <>
      <button
        type="button"
        title={collapsed ? 'AI usage' : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]',
          collapsed ? 'justify-center px-0' : 'pl-3 pr-3'
        )}
      >
        <Activity className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">AI usage</span>}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="AI usage">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              API tokens, characters, credits charged, and estimated Anthropic cost.
            </p>
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Input tokens</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(totals?.input_tokens ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Output tokens</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(totals?.output_tokens ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Input chars</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(totals?.input_chars ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Output chars</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatNum(totals?.output_chars ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Credits used</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatCredits(totals?.credits_consumed ?? 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--color-border)] p-3">
                  <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Est. API cost</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                    {formatUsd(totals?.usd_cost ?? 0)}
                  </p>
                </div>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-lg border border-[var(--color-border)]">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--color-surface)]">
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-muted)]">
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">In tok</th>
                      <th className="px-3 py-2 text-right">Out tok</th>
                      <th className="px-3 py-2 text-right">In ch</th>
                      <th className="px-3 py-2 text-right">Out ch</th>
                      <th className="px-3 py-2 text-right">Credits</th>
                      <th className="px-3 py-2 text-right">Cost</th>
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
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatNum(row.input_chars)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatNum(row.output_chars)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatCredits(row.credits_consumed)}
                        </td>
                        <td className="px-3 py-2 text-right text-[var(--color-text-secondary)]">
                          {formatUsd(row.usd_cost)}
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
                        {row.category} / {row.operation}: in {formatNum(row.input_tokens)} / out{' '}
                        {formatNum(row.output_tokens)} tok · in {formatNum(row.input_chars)} / out{' '}
                        {formatNum(row.output_chars)} ch · {formatCredits(row.credits_consumed ?? 0)} cr ·{' '}
                        {formatUsd(row.usd_cost ?? 0)} ({row.event_count} calls)
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {(data?.recent?.length ?? 0) > 0 ? (
                <details className="rounded-lg border border-[var(--color-border)] p-3 text-sm" open>
                  <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">
                    Recent calls ({data?.recent.length})
                  </summary>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[var(--color-text-secondary)]">
                    {data?.recent.map((row) => (
                      <li key={row.id ?? `${row.category}-${row.created_at}`}>{recentLabel(row)}</li>
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
