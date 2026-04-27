'use client';

import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/shared/AppHeader';
import { GuestCvChrome } from '@/components/cv/GuestCvChrome';
import { MeshBackground } from '@/components/layout/MeshBackground';
import { SubscriptionBanner } from '@/components/shared/SubscriptionBanner';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { PageTransition } from '@/components/shared/PageTransition';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { isGuestPublicCvPath } from '@/lib/guest-cv-paths';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const guestSurface = isGuestPublicCvPath(pathname);

  const mainInner = (
    <OnboardingGate>
      <PageTransition>{children}</PageTransition>
    </OnboardingGate>
  );

  if (guestSurface && !user) {
    return <GuestCvChrome>{mainInner}</GuestCvChrome>;
  }

  if (guestSurface && user) {
    return (
      <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <MeshBackground />
        <SubscriptionBanner />
        <AppHeader />
        <main
          className={cn(
            'relative z-10 flex-1 px-4 pb-8 pt-14 transition-all duration-300 lg:px-8 lg:pb-12 lg:pt-8',
            sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          )}
        >
          {mainInner}
        </main>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <MeshBackground />
        <SubscriptionBanner />
        <AppHeader />
        <main
          className={cn(
            'relative z-10 flex-1 px-4 pb-8 pt-14 transition-all duration-300 lg:px-8 lg:pb-12 lg:pt-8',
            sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
          )}
        >
          {mainInner}
        </main>
      </div>
    </AuthGuard>
  );
}
