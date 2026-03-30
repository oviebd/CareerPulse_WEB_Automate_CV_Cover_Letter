import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/shared/AppHeader';
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
      <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-secondary)]">
        <SubscriptionBanner />
        <div className="flex min-h-[calc(100vh-0px)] flex-col">
          <AppHeader />
          <main className="flex-1 p-4 lg:p-8">
            <OnboardingGate>
              <PageTransition>{children}</PageTransition>
            </OnboardingGate>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
