import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/30 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 font-display text-sm font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-accent-mint)] text-[9px] font-bold text-white">
            CP
          </span>
          CareerPulse
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm" aria-label="Footer">
          <Link
            href="/pricing"
            className="text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary-500)]"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary-500)]"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary-500)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="font-semibold text-[var(--color-primary-500)] transition hover:brightness-110"
          >
            Sign up free
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-[var(--color-muted)]">
        CVs, cover letters, application tracking, and interview prep for job seekers worldwide.
      </p>
    </footer>
  );
}
