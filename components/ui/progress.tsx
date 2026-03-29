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
        'h-2 w-full overflow-hidden rounded-full bg-slate-200',
        className
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all',
          colorClass ?? 'bg-[var(--color-primary)]'
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
