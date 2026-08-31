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

      {!loading && options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="font-medium text-[var(--color-text-primary)]">You need a base CV first</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Upload an existing CV or create one in the builder before tailoring to a job.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/cv/upload"
              className="inline-flex items-center rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
            >
              Upload CV
            </Link>
            <Link
              href="/cv/edit"
              className="inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Create CV
            </Link>
          </div>
        </div>
      ) : (
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
            href="/cv/edit"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <Plus className="h-4 w-4" />
            New CV
          </Link>
        </div>
      </div>
      )}
    </section>
  );
}
