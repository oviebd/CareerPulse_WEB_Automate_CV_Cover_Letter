import { cn } from '@/lib/utils';

export function PremiumLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-gold)]',
        className
      )}
    >
      Premium
    </span>
  );
}
