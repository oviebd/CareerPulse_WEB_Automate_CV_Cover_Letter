import { MarketingSiteHeader } from '@/components/marketing/MarketingSiteHeader';
import { LandingHashScroll } from '@/components/marketing/LandingHashScroll';
import { MeshBackground } from '@/components/layout/MeshBackground';

export const revalidate = 3600;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <MeshBackground />
      <MarketingSiteHeader />
      <LandingHashScroll />
      <div className="relative z-10 pt-16">{children}</div>
    </div>
  );
}
