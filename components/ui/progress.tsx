import { cn } from '@/lib/utils';

export function Progress({
  value,
  className,
  colorClass,
}: {
  value: number;
  className?: string;
  colorClass?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-white/[0.08]',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          colorClass ??
            'bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent-mint)]'
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
