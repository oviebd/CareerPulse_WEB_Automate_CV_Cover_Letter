'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Card wrapper for a single CV section’s editing surface (spacing + hierarchy). */
export function EditorSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-surface)]/80 p-4 shadow-sm sm:p-5',
        className
      )}
    >
      {title ? (
        <header className="mb-4 border-b border-[var(--color-border)]/60 pb-3">
          <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Dense row/card for repeatable items inside a section. */
export function EditorCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-input-bg)]/40 p-3 sm:p-4',
        className
      )}
    >
      {children}
    </div>
  );
}
