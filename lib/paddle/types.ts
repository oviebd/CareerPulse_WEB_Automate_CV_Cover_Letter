export type BillingSource = 'paddle' | 'promo' | 'admin' | 'none';

export type BillingSubscriptionDto = {
  plan: 'free' | 'pro_monthly' | 'pro_yearly';
  tier: 'free' | 'pro';
  status: import('@/types').SubscriptionStatus;
  billingInterval: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  source: BillingSource;
  canChangePlan: boolean;
  canManageBilling: boolean;
};
