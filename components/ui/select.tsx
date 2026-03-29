'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={selectId}
            className="mb-1 block text-sm font-medium text-[var(--color-secondary)]"
          >
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none ring-[var(--color-primary)] transition focus:ring-2',
            error && 'border-red-400',
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
