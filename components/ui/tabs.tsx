'use client';

import { motion } from 'framer-motion';
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
            'relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition',
            value === t.id
              ? 'text-white'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
          )}
        >
          {value === t.id ? (
            <motion.span
              layoutId="activeTab"
              className="absolute inset-0 -z-10 rounded-full bg-[var(--color-primary)]"
              transition={{ duration: 0.2 }}
            />
          ) : null}
          {t.label}
        </button>
      ))}
    </div>
  );
}
