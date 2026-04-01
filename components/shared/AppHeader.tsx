'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
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

function NavLinkContent({
  item,
  pathname,
  isFree,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  isFree: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.children) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {item.label}
        </div>
        <div className="space-y-0.5 border-l border-[var(--color-border)] pl-2 ml-3">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childActive =
              item.href === '/cv'
                ? isCvChildActive(pathname, child.href)
                : item.href === '/cover-letters'
                  ? isCoverLetterChildActive(pathname, child.href)
                  : pathname === child.href || pathname.startsWith(`${child.href}/`);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  childActive
                    ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)]'
                    : 'text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]'
                )}
              >
                <ChildIcon className="h-4 w-4 shrink-0 opacity-90" />
                <span className="min-w-0 flex-1 truncate">{child.label}</span>
                {child.proOnly && isFree ? (
                  <span className="shrink-0 rounded-badge bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-gold)]">
                    Pro
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.99]',
        active
          ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-400)] shadow-[0_0_0_1px_rgba(108,99,255,0.2)]'
          : 'text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text-primary)]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { tier } = useSubscription();
  const isFree = tier === 'free';
  const { mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu } = useUIStore();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  const brand = (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-[var(--color-text-primary)] transition hover:opacity-90"
      onClick={() => setMobileMenuOpen(false)}
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] text-xs font-bold text-white shadow-md">
        CP
      </span>
      <span className="hidden sm:inline">CareerPulse</span>
    </Link>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-xl lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--color-border)] px-4">
          {brand}
        </div>
        <nav ref={navRef} className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLinkContent key={item.href} item={item} pathname={pathname} isFree={isFree} />
          ))}
        </nav>
        <div className="shrink-0 border-t border-[var(--color-border)] p-3">
          <div className="flex items-center justify-end gap-2">
            <ProfileMenu />
          </div>
        </div>
      </aside>

      {/* Mobile: top bar */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 backdrop-blur-xl lg:hidden">
        {brand}
        <div className="flex items-center gap-2">
          <ProfileMenu />
          <button
            type="button"
            className="rounded-btn p-2 text-[var(--color-text-primary)] transition hover:bg-white/[0.06] active:scale-95"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-105%' }}
              animate={{ x: 0 }}
              exit={{ x: '-105%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2.5rem,300px)] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl lg:hidden"
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
                <span className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                  Menu
                </span>
                <button
                  type="button"
                  className="rounded-btn p-2 text-[var(--color-muted)] hover:bg-white/[0.06] hover:text-[var(--color-text-primary)]"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {nav.map((item) => (
                  <NavLinkContent
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    isFree={isFree}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>
              <p className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-muted)]">
                Account and billing live in the profile menu (top right).
              </p>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
