import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — CV & Cover Letter',
  description: 'Sign in to manage your CV and cover letters',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-secondary)]">
      {children}
    </div>
  );
}
