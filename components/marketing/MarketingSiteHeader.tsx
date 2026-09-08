'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FileText,
  LayoutTemplate,
  Menu,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingThemeToggle } from '@/components/shared/MarketingThemeToggle';
import { BuildCvLink } from '@/components/marketing/BuildCvLink';
import { isBuildCvNavActive, isMarketingNavActive } from '@/lib/marketing/navActive';
import { useAuthStore } from '@/stores/useAuthStore';

const nav = [
  { href: '/#features', label: 'Features', icon: Sparkles },
  { href: '/#interview', label: 'Interview', icon: MessageSquare },
  { href: '/#templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/pricing', label: 'Pricing', icon: null },
] as const;

function marketingNavClass(active: boolean, extra?: string) {
  return cn(
    'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
    extra,
    active
      ? 'bg-[var(--color-primary-100)] font-semibold text-[var(--color-primary-500)]'
      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]'
  );
}

function MarketingNavItems({
  pathname,
  hash,
  showIcons,
  onSelect,
}: {
  pathname: string;
  hash: string;
  showIcons?: boolean;
  onSelect?: (href: string) => void;
}) {
  return (
    <>
      {nav.map((item) => {
        const active = isMarketingNavActive(pathname, hash, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={() => onSelect?.(item.href)}
            className={marketingNavClass(active)}
          >
            {showIcons && item.icon ? <item.icon className="h-4 w-4" /> : null}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function MarketingSiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState('');
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const buildCvActive = isBuildCvNavActive(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300',
        scrolled
          ? 'border-[var(--color-border)] bg-[var(--color-surface)]/95 shadow-sm backdrop-blur-md'
          : 'border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] text-[10px] font-bold text-white shadow">
            CP
          </span>
          <span>CareerPulse</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Marketing">
          <MarketingNavItems
            pathname={pathname}
            hash={hash}
            showIcons
            onSelect={(href) => {
              if (href.startsWith('/#')) setHash(href.slice(1));
            }}
          />
          <BuildCvLink
            aria-current={buildCvActive ? 'page' : undefined}
            className={marketingNavClass(buildCvActive, 'ml-1')}
          >
            <FileText className="h-4 w-4" />
            Build CV
          </BuildCvLink>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <MarketingThemeToggle />
          {initialized && user ? (
            <Link
              href="/dashboard"
              className="rounded-btn bg-[var(--color-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="shrink-0 whitespace-nowrap rounded-btn px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="shrink-0 whitespace-nowrap rounded-btn bg-[var(--color-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Signup
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <MarketingThemeToggle />
          <button
            type="button"
            className="rounded-btn p-2"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <MarketingNavItems
              pathname={pathname}
              hash={hash}
              onSelect={(href) => {
                if (href.startsWith('/#')) setHash(href.slice(1));
                setOpen(false);
              }}
            />
            <BuildCvLink
              aria-current={buildCvActive ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={marketingNavClass(buildCvActive)}
            >
              Build CV
            </BuildCvLink>
            {initialized && user ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-btn bg-[var(--color-primary-500)] py-2.5 text-center text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-btn border border-[var(--color-border)] py-2.5 text-center text-sm font-semibold"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-btn bg-[var(--color-primary-500)] py-2.5 text-center text-sm font-semibold text-white"
                >
                  Signup
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
