import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  padding = 'md',
}: {
  className?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}) {
  const p = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  }[padding];
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm',
        p,
        className
      )}
    >
      {children}
    </div>
  );
}


export function CardHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mb-4 border-b border-[var(--color-border)] pb-3', className)}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mt-4 border-t border-[var(--color-border)] pt-3', className)}>
      {children}
    </div>
  );
}
