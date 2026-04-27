'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepId = 1 | 2 | 3;

type StepperHeaderProps = {
  currentStep: StepId;
  maxAccessibleStep: StepId;
  onStepClick: (step: StepId) => void;
};

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: 'Choose CV' },
  { id: 2, label: 'Job Details' },
  { id: 3, label: 'Generate' },
];

export function StepperHeader({ currentStep, maxAccessibleStep, onStepClick }: StepperHeaderProps) {
  return (
    <nav className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((step, idx) => {
          const isActive = currentStep === step.id;
          const isComplete = step.id < currentStep;
          const isAccessible = step.id <= maxAccessibleStep;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => isAccessible && onStepClick(step.id)}
                disabled={!isAccessible}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition sm:px-3 sm:py-2.5',
                  isActive && 'border-[var(--color-primary)] bg-[var(--color-primary)]/8',
                  isComplete &&
                    'border-emerald-300 bg-emerald-50 dark:border-emerald-500/65 dark:bg-emerald-500/24',
                  !isActive && !isComplete && 'border-[var(--color-border)]',
                  !isAccessible && 'cursor-not-allowed opacity-55'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    isComplete && 'bg-emerald-600 text-white dark:bg-emerald-500',
                    isActive && 'bg-[var(--color-primary)] text-white',
                    !isActive && !isComplete && 'bg-[var(--color-input-bg)] text-[var(--color-muted)]'
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : step.id}
                </span>
                <span
                  className={cn(
                    'truncate text-xs font-medium sm:text-sm',
                    isActive && 'text-[var(--color-text-primary)]',
                    isComplete && 'text-emerald-900 dark:text-emerald-100',
                    !isActive && !isComplete && 'text-[var(--color-muted)]'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 ? <span className="hidden text-[var(--color-muted)] sm:inline">→</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
