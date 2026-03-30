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
              'w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm outline-none transition duration-150 focus:border-[var(--color-primary-500)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.2)]',
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
