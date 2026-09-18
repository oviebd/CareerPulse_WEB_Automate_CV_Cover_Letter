'use client';

import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { FreePlanCard, UpgradePlans } from '@/components/billing/UpgradePlans';
import { PastDueBanner } from '@/components/billing/PastDueBanner';
import { PromoCodeCard } from '@/components/billing/PromoCodeCard';
import { PaymentHistory } from '@/components/billing/PaymentHistory';
import { ActionPacksCard } from '@/components/billing/ActionPacksCard';
import { LearnCreditsCard } from '@/components/billing/LearnCreditsCard';
import { useBillingSubscription } from '@/hooks/useBillingSubscription';
import { useSubscription } from '@/hooks/useSubscription';

export default function BillingPage() {
  const { billedTier, profile } = useSubscription();
  const { data: billing } = useBillingSubscription();
  const showPremium = (billing?.tier ?? billedTier) === 'pro';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Manage your plan and payment details.</p>
      </div>

      {billing?.status === 'past_due' && (
        <PastDueBanner canManageBilling={billing.canManageBilling} />
      )}

      {showPremium && billing ? (
        <CurrentPlanCard billing={billing} profile={profile} />
      ) : (
        <FreePlanCard email={profile?.email} />
      )}

      {!showPremium && <UpgradePlans allowCheckout />}

      <ActionPacksCard />

      <LearnCreditsCard />

      <PromoCodeCard profile={profile} />
      <PaymentHistory />
    </div>
  );
}
