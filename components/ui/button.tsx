import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-600)] text-white shadow-md hover:-translate-y-px hover:shadow-lg hover:brightness-105 active:scale-[0.98]',
  secondary:
    'border border-[var(--color-border)] bg-[var(--color-glass-bg)] text-[var(--color-text-primary)] backdrop-blur-sm hover:bg-white/[0.06] hover:border-[var(--color-border-hover)] active:scale-[0.98]',
  ghost:
    'text-[var(--color-text-primary)] hover:bg-white/[0.06] active:scale-[0.98]',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-110 active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-btn',
  md: 'px-4 py-2.5 text-sm rounded-btn',
  lg: 'px-5 py-3 text-base rounded-btn',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex min-w-[88px] items-center justify-center gap-2 font-semibold transition-all duration-200 ease-out focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
