'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Coins,
  CreditCard,
  LayoutDashboard,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/promo-codes', label: 'Promo codes', icon: Tag },
  { href: '/admin/credits', label: 'Credits', icon: Coins },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/ai-usage', label: 'AI usage', icon: Sparkles },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--color-border)] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Super Admin
          </p>
          <h1 className="mt-1 font-display text-lg font-semibold text-[var(--color-text-primary)]">
            CareerPulse
          </h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Admin
          </p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                    active
                      ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]'
                      : 'bg-[var(--color-control-bg)] text-[var(--color-text-secondary)]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-[var(--color-text-primary)]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--color-primary-100)] p-2.5 text-[var(--color-primary-700)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export { BarChart3 };
