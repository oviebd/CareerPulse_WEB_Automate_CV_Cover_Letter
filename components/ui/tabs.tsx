'use client';

import { cn } from '@/lib/utils';

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-[var(--color-border)]',
        className
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition',
            value === t.id
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-secondary)]'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
