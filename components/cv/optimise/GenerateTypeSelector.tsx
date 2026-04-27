'use client';

import type { GenerationType } from '@/types';
import { cn } from '@/lib/utils';

const OPTIONS: { value: GenerationType; label: string; helper: string }[] = [
  { value: 'cv', label: 'CV only', helper: 'Tailor your CV for this role' },
  { value: 'coverLetter', label: 'Cover letter', helper: 'Generate a tailored cover letter' },
  { value: 'both', label: 'Both', helper: 'Generate CV and cover letter together' },
];

type GenerateTypeSelectorProps = {
  value: GenerationType;
  onChange: (v: GenerationType) => void;
};

export function GenerateTypeSelector({ value, onChange }: GenerateTypeSelectorProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Step 3</p>
        <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Choose output type</h2>
        <p className="text-sm text-[var(--color-muted)]">Select what you want to generate for this role.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-full border px-5 py-4 text-left transition',
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
              )}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className={cn('mt-1 text-xs', selected ? 'text-white/85' : 'text-[var(--color-muted)]')}>
                {option.helper}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
