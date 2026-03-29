'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cv', label: 'CV' },
  { href: '/cover-letters', label: 'Cover letters' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/ai-tools', label: 'AI tools' },
  { href: '/settings', label: 'Settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-60 border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4 font-display font-semibold">
          CV &amp; CL
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-blue-50 text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:bg-slate-50 hover:text-[var(--color-secondary)]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
    </>
  );
}
