import type { Metadata } from 'next';
import { MeshBackground } from '@/components/layout/MeshBackground';

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
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <MeshBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
