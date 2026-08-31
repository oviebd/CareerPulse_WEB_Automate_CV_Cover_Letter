'use client';

import { cn } from '@/lib/utils';

export type TooltipSide = 'top' | 'bottom';

export function Tooltip({
  content,
  children,
  className,
  side = 'top',
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
  side?: TooltipSide;
}) {
  if (!content) return <>{children}</>;

  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 z-[90] max-w-[16rem] -translate-x-1/2 rounded bg-[var(--color-text-primary)] px-2 py-1 text-center text-xs leading-snug text-[var(--color-background)] opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-within:opacity-100',
          side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        )}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
