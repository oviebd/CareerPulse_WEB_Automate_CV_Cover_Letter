'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FileText, LayoutTemplate, Menu, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MeshBackground } from '@/components/layout/MeshBackground';
import { useGuestCvStore } from '@/stores/guestCvStore';

const links = [
  { href: '/#templates', label: 'Templates' },
  { href: '/#features', label: 'Features' },
  { href: '/cv/builder?guest=true', label: 'Build CV' },
] as const;

export function GuestCvChrome({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasGuestDraft = useGuestCvStore((s) => s.guestEditorState !== null);

  const search = searchParams.toString();
  const currentRelPath = `${pathname}${search ? `?${search}` : ''}`;
  const authQs = new URLSearchParams({
    returnTo: currentRelPath,
    preserveGuestCv: 'true',
  }).toString();
  const loginHref = hasGuestDraft ? `/login?${authQs}` : '/login';
  const registerHref = hasGuestDraft ? `/register?${authQs}` : '/register';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <MeshBackground />
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-40 border-b transition-colors duration-300',
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
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] text-xs font-bold text-white shadow-md">
              CP
            </span>
            <span>CareerPulse</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
              >
                {l.label === 'Templates' ? <LayoutTemplate className="h-4 w-4" /> : null}
                {l.label === 'Features' ? <Sparkles className="h-4 w-4" /> : null}
                {l.label === 'Build CV' ? <FileText className="h-4 w-4" /> : null}
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <ThemeToggle />
            <Link
              href={loginHref}
              className="shrink-0 whitespace-nowrap rounded-btn px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]"
            >
              Log in
            </Link>
            <Link
              href={registerHref}
              className="shrink-0 whitespace-nowrap rounded-btn bg-[var(--color-primary-500)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Signup
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
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
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg py-2 text-sm font-medium"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={loginHref}
                onClick={() => setOpen(false)}
                className="mt-1 rounded-btn border border-[var(--color-border)] py-2.5 text-center text-sm font-semibold"
              >
                Log in
              </Link>
              <Link
                href={registerHref}
                onClick={() => setOpen(false)}
                className="rounded-btn bg-[var(--color-primary-500)] py-2.5 text-center text-sm font-semibold text-white"
              >
                Signup
              </Link>
            </div>
          </div>
        ) : null}
      </header>
      <div className="relative z-10 pt-16">{children}</div>
    </div>
  );
}
