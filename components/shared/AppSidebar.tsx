'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useSubscription } from '@/hooks/useSubscription';

interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
  badge?: string;
  proOnly?: boolean;
}

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  {
    href: '/cv',
    label: 'CV',
    children: [
      { href: '/cv', label: 'My CV' },
      { href: '/cv/optimise', label: 'Tailor for Job', proOnly: true },
      { href: '/cv/job-specific', label: 'Job CVs' },
    ],
  },
  { href: '/cover-letters', label: 'Cover letters' },
  { href: '/tracker', label: 'Tracker' },
  { href: '/ai-tools', label: 'AI tools' },
  { href: '/settings', label: 'Settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { tier } = useSubscription();
  const isFree = tier === 'free';

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
            if (item.children) {
              const sectionActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                item.children.some(
                  (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
                );

              return (
                <div key={item.href} className="space-y-0.5">
                  <span
                    className={cn(
                      'block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider',
                      sectionActive
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-muted)]'
                    )}
                  >
                    {item.label}
                  </span>
                  {item.children.map((child) => {
                    const childActive =
                      child.href === '/cv'
                        ? pathname === '/cv' ||
                          pathname === '/cv/edit' ||
                          pathname === '/cv/upload' ||
                          pathname.startsWith('/cv/templates')
                        : pathname === child.href ||
                          pathname.startsWith(`${child.href}/`);

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 pl-5 text-sm font-medium transition',
                          childActive
                            ? 'bg-blue-50 text-[var(--color-primary)]'
                            : 'text-[var(--color-muted)] hover:bg-slate-50 hover:text-[var(--color-secondary)]'
                        )}
                      >
                        {child.label}
                        {child.proOnly && isFree && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Pro
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            }

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
