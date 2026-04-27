'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Select } from '@/components/ui/select';
import type { CoreCVVersion } from '@/hooks/useCV';
import { formatDate } from '@/lib/utils';

type Step1CVSelectorProps = {
  options: CoreCVVersion[];
  loading: boolean;
  selectedCvId: string | null;
  onSelect: (id: string) => void;
};

export function Step1CVSelector({ options, loading, selectedCvId, onSelect }: Step1CVSelectorProps) {
  const selectOptions =
    options.length > 0
      ? options.map((cv) => ({
          value: cv.id,
          label: `${cv.name || 'Untitled CV'} · Updated ${formatDate(cv.updated_at)}`,
        }))
      : [{ value: '', label: 'No base CV found', disabled: true }];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Step 1</p>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Choose your base CV</h2>
        <p className="text-sm text-[var(--color-muted)]">Pick one core CV version as the source for optimization.</p>
      </header>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
        <Select
          label={loading ? 'Loading base CVs...' : 'Base CV'}
          value={selectedCvId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading || options.length === 0}
          options={selectOptions}
        />
        <div className="mt-3 flex items-center justify-end">
          <Link
            href="/cv/builder"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <Plus className="h-4 w-4" />
            New CV
          </Link>
        </div>
      </div>
    </section>
  );
}
