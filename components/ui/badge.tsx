import { cn } from '@/lib/utils';

const variants = {
  default:
    'bg-[var(--color-control-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]',
  success:
    'bg-[var(--color-accent-mint)]/15 text-[var(--color-accent-mint)] border border-[var(--color-accent-mint)]/25',
  warning:
    'bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/25',
  danger:
    'bg-[var(--color-accent-coral)]/15 text-[var(--color-accent-coral)] border border-[var(--color-accent-coral)]/25',
  info: 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)] border border-[var(--color-primary-200)]',
};

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-badge px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
