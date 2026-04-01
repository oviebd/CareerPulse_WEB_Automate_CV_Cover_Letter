import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/shared/AppHeader';
import { MeshBackground } from '@/components/layout/MeshBackground';
import { SubscriptionBanner } from '@/components/shared/SubscriptionBanner';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { PageTransition } from '@/components/shared/PageTransition';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <MeshBackground />
        <SubscriptionBanner />
        <AppHeader />
        <main className="relative z-10 flex-1 px-4 pb-8 pt-14 lg:ml-64 lg:px-8 lg:pb-12 lg:pt-8">
          <OnboardingGate>
            <PageTransition>{children}</PageTransition>
          </OnboardingGate>
        </main>
      </div>
    </AuthGuard>
  );
}
