'use client';

import type { ReactNode } from 'react';

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
