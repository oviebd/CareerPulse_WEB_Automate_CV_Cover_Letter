import Link from 'next/link';
import { MeshBackground } from '@/components/layout/MeshBackground';
import { MarketingThemeToggle } from '@/components/shared/MarketingThemeToggle';

export const revalidate = 3600;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <MeshBackground />
      <header className="relative z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-display text-sm font-semibold tracking-tight">
            CareerPulse
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-4 text-sm font-medium sm:gap-6">
            <MarketingThemeToggle />
            <Link
              href="/pricing"
              className="text-[var(--color-muted)] transition duration-200 hover:text-[var(--color-primary)]"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="text-[var(--color-muted)] transition duration-200 hover:text-[var(--color-primary)]"
            >
              Blog
            </Link>
            <Link href="/login" className="font-semibold text-[var(--color-primary)]">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
