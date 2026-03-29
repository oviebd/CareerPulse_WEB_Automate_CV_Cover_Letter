import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, helperText, leftIcon, rightIcon, id, ...props },
    ref
  ) => {
    const inputId = id ?? props.name;
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
        <div className="relative flex items-center">
          {leftIcon ? (
            <span className="pointer-events-none absolute left-3 text-[var(--color-muted)]">
              {leftIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none ring-[var(--color-primary)] transition focus:ring-2',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-400 focus:ring-red-400',
              className
            )}
            {...props}
          />
          {rightIcon ? (
            <span className="absolute right-3 text-[var(--color-muted)]">
              {rightIcon}
            </span>
          ) : null}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-[var(--color-muted)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
