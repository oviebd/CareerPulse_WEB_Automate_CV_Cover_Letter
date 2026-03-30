'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText,
  Kanban,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthStore } from '@/stores/useAuthStore';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  proOnly?: boolean;
}

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    href: '/cv',
    label: 'CV',
    icon: FileText,
    children: [
      { href: '/cv', label: 'My CV', icon: User },
      { href: '/cv/optimise', label: 'Tailor for Job', icon: Wand2, proOnly: true },
      { href: '/cv/job-specific', label: 'Job CVs', icon: Briefcase },
    ],
  },
  { href: '/cover-letters', label: 'Cover letters', icon: Mail },
  { href: '/tracker', label: 'Tracker', icon: Kanban },
  { href: '/ai-tools', label: 'AI tools', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { tier } = useSubscription();
  const isFree = tier === 'free';

  useEffect(() => {
    const value = window.localStorage.getItem('sidebarCollapsed');
    if (value != null) setSidebarCollapsed(value === '1');
  }, [setSidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  return (
    <>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 border-r border-white/10 bg-gradient-to-b from-[var(--color-primary-900)] to-[#312e81] text-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b border-white/10 px-4 font-display font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">CP</span>
          <AnimatePresence>
            {!sidebarCollapsed ? (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2 text-sm">
                CareerPulse
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {nav.map((item) => {
            const Icon = item.icon;
            if (item.children) {
              const sectionActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                item.children.some(
                  (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
                );

              return (
                <div key={item.href} className="space-y-1">
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
                      sectionActive
                        ? 'border-l-[3px] border-white bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/8'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <AnimatePresence>
                      {!sidebarCollapsed ? (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {item.label}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
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
                          'ml-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                          childActive
                            ? 'border-l-[3px] border-white bg-white/15 text-white'
                            : 'text-white/75 hover:bg-white/8 hover:text-white'
                        )}
                      >
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <AnimatePresence>
                          {!sidebarCollapsed ? (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              {child.label}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                        {child.proOnly && isFree && (
                          <span className="rounded bg-amber-300/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
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
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'border-l-[3px] border-white bg-white/15 text-white'
                    : 'text-white/80 hover:bg-white/8 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed ? (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            <AnimatePresence>
              {!sidebarCollapsed ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Collapse
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/10 p-2">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">
                {(profile?.full_name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
              </span>
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{profile?.full_name || 'User'}</p>
                  <p className="truncate text-[11px] text-white/70">{profile?.email}</p>
                </div>
              ) : null}
            </div>
            {!sidebarCollapsed ? <SignOutButton /> : null}
          </div>
        </nav>
      </motion.aside>
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
