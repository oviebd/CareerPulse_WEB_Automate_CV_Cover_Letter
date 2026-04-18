'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/useThemeStore';

type Props = {
  collapsed?: boolean;
  /** Icon-only control for tight headers (e.g. marketing). */
  compact?: boolean;
  className?: string;
};

export function ThemeToggle({ collapsed, compact, className }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDark}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-glass-bg)] text-[var(--color-text-primary)] transition-all duration-200 ease-out',
          'hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-hover-surface)] active:scale-[0.98]',
          className
        )}
      >
        {isDark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={cn(
        'group flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-glass-bg)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-text-primary)] transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-hover-surface)] active:scale-[0.98]',
        collapsed && 'justify-center px-0',
        className
      )}
    >
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          isDark
            ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)]'
            : 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
        )}
      >
        {isDark ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
      </span>
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate">{isDark ? 'Dark mode' : 'Light mode'}</span>
      ) : null}
    </button>
  );
}
