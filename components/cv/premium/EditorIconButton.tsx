'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/tooltip';

export function EditorIconButton({
  label,
  tooltip,
  pressed,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tooltip?: string;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip content={tooltip ?? label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border transition',
          pressed
            ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-100)]/80 text-[var(--color-primary-500)]'
            : 'border-[var(--color-border)] bg-[var(--color-control-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-control-bg-hover)] hover:text-[var(--color-text-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
}
