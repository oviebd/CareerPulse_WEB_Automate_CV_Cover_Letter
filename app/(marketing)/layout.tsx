import Link from 'next/link';

export const revalidate = 3600;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-secondary)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="font-display font-semibold">
            CV &amp; Cover Letter
          </Link>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/pricing" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
              Pricing
            </Link>
            <Link href="/blog" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
              Blog
            </Link>
            <Link href="/login" className="text-[var(--color-primary)]">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
