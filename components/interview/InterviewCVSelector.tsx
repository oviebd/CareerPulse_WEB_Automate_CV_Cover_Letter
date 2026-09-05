'use client';

import Link from 'next/link';
import { Select } from '@/components/ui/select';
import type { InterviewCVOption } from '@/hooks/useCV';
import { formatDate } from '@/lib/utils';

type InterviewCVSelectorProps = {
  options: InterviewCVOption[];
  loading: boolean;
  selectedCvId: string | null;
  onSelect: (id: string) => void;
};

function cvLabel(cv: InterviewCVOption) {
  const kind = cv.kind === 'job-specific' ? 'Job-specific' : 'General';
  return `${cv.name || 'Untitled CV'} · ${kind} · Updated ${formatDate(cv.updated_at)}`;
}

export function InterviewCVSelector({
  options,
  loading,
  selectedCvId,
  onSelect,
}: InterviewCVSelectorProps) {
  const selectOptions =
    options.length > 0
      ? options.map((cv) => ({
          value: cv.id,
          label: cvLabel(cv),
        }))
      : [{ value: '', label: 'No CV found', disabled: true }];

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Step 1
        </p>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
          Choose your CV
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          Use any general or job-specific CV as the basis for your interview preparation.
        </p>
      </header>

      {!loading && options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="font-medium text-[var(--color-text-primary)]">You need a CV first</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Go to Documents to upload an existing CV or create one before starting interview
            preparation.
          </p>
          <Link
            href="/documents"
            className="mt-4 inline-flex items-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to Documents
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <Select
            label={loading ? 'Loading CVs…' : 'CV for interview prep'}
            value={selectedCvId ?? ''}
            onChange={(e) => onSelect(e.target.value)}
            disabled={loading || options.length === 0}
            options={selectOptions}
          />
          <div className="mt-3 flex items-center justify-end">
            <Link
              href="/documents"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Manage CVs in Documents
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
