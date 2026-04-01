import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function Card({
  className,
  children,
  padding = 'md',
  hoverable = false,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}) {
  const p = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  }[padding];
  return (
    <motion.div
      className={cn(
        'glass-panel rounded-card border border-[var(--color-border)] shadow-sm transition-all duration-200',
        hoverable &&
          'hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:shadow-md',
        p,
        className
      )}
      whileHover={hoverable ? { y: -2 } : undefined}
    >
      {children}
    </motion.div>
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
