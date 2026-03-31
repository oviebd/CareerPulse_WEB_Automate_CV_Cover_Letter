'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  ChevronDown,
  FileText,
  Kanban,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Menu,
  Settings,
  Sparkles,
  User,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ProfileMenu } from '@/components/shared/ProfileMenu';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { useUIStore } from '@/stores/useUIStore';

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
  {
    href: '/cover-letters',
    label: 'Cover letters',
    icon: Mail,
    children: [
      { href: '/cover-letters', label: 'My letters', icon: Mail },
      { href: '/cover-letters/templates', label: 'Templates', icon: LayoutTemplate },
    ],
  },
  { href: '/tracker', label: 'Tracker', icon: Kanban },
  { href: '/ai-tools', label: 'AI tools', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isCvChildActive(pathname: string, href: string) {
  if (href === '/cv') {
    return (
      pathname === '/cv' ||
      pathname === '/cv/edit' ||
      pathname === '/cv/upload' ||
      pathname.startsWith('/cv/templates')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCoverLetterChildActive(pathname: string, href: string) {
  if (href === '/cover-letters') {
    return (
      pathname === '/cover-letters' ||
      pathname.startsWith('/cover-letters/new') ||
      (pathname.startsWith('/cover-letters/') &&
        !pathname.startsWith('/cover-letters/templates'))
    );
  }
  if (href === '/cover-letters/templates') {
    return pathname.startsWith('/cover-letters/templates');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const { tier } = useSubscription();
  const isFree = tier === 'free';
  const { mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu } = useUIStore();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenSubmenu(null);
  }, [pathname, setMobileMenuOpen]);

  const navLinkClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
      active ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
    );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-[var(--color-primary-900)] to-[#312e81] text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:px-4 lg:px-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 font-display font-semibold"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-xs">
              CP
            </span>
            <span className="hidden sm:inline text-sm">CareerPulse</span>
          </Link>

          {/* Desktop nav only; small widths use hamburger */}
          <nav ref={navRef} className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-visible px-2 lg:flex">
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
                  <div key={item.href} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSubmenu((prev) => (prev === item.href ? null : item.href))
                      }
                      className={navLinkClass(sectionActive)}
                      aria-expanded={openSubmenu === item.href}
                      aria-haspopup="true"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition',
                          openSubmenu === item.href && 'rotate-180'
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {openSubmenu === item.href ? (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-white/10 bg-[#312e81] py-1 shadow-lg"
                        >
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            const childActive =
                              item.href === '/cv'
                                ? isCvChildActive(pathname, child.href)
                                : item.href === '/cover-letters'
                                  ? isCoverLetterChildActive(pathname, child.href)
                                  : pathname === child.href ||
                                    pathname.startsWith(`${child.href}/`);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 text-sm transition',
                                  childActive
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/90 hover:bg-white/10'
                                )}
                                onClick={() => setOpenSubmenu(null)}
                              >
                                <ChildIcon className="h-4 w-4" />
                                {child.label}
                                {child.proOnly && isFree ? (
                                  <span className="ml-auto rounded bg-amber-300/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                    Pro
                                  </span>
                                ) : null}
                              </Link>
                            );
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              }
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={cn(navLinkClass(active), 'shrink-0')}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <ProfileMenu />
            <button
              type="button"
              className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen nav */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-0 top-14 z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-white/10 bg-gradient-to-b from-[var(--color-primary-900)] to-[#312e81] p-4 shadow-xl lg:hidden"
            >
              <div className="flex flex-col gap-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  if (item.children) {
                    return (
                      <div key={item.href} className="rounded-lg border border-white/10 p-2">
                        <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </div>
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive =
                            item.href === '/cv'
                              ? isCvChildActive(pathname, child.href)
                              : item.href === '/cover-letters'
                                ? isCoverLetterChildActive(pathname, child.href)
                                : pathname === child.href ||
                                  pathname.startsWith(`${child.href}/`);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                                childActive ? 'bg-white/15 text-white' : 'text-white/90'
                              )}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <ChildIcon className="h-4 w-4" />
                              {child.label}
                              {child.proOnly && isFree ? (
                                <span className="ml-auto rounded bg-amber-300/90 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                  Pro
                                </span>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium',
                        active ? 'bg-white/15 text-white' : 'text-white/90'
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="px-1 text-xs text-white/70">
                  Use the profile icon (top right) for account, plans, and sign out.
                </p>
              </div>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
