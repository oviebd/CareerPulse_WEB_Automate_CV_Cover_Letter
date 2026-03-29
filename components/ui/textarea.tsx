import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, maxLength, id, value, ...props }, ref) => {
    const inputId = id ?? props.name;
    const len =
      typeof value === 'string' ? value.length : undefined;
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-[var(--color-secondary)]"
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          maxLength={maxLength}
          value={value}
          className={cn(
            'min-h-[120px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none ring-[var(--color-primary)] transition focus:ring-2',
            error && 'border-red-400',
            className
          )}
          {...props}
        />
        <div className="mt-1 flex justify-between gap-2">
          {error ? (
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          ) : (
            <span />
          )}
          {maxLength != null && len !== undefined ? (
            <span className="text-xs text-[var(--color-muted)]">
              {len}/{maxLength}
            </span>
          ) : null}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
