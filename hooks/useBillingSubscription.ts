'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';
import type { BillingSubscriptionDto } from '@/lib/paddle/types';

export function useBillingSubscription() {
  return useQuery({
    queryKey: ['billing-subscription'],
    queryFn: () => apiFetch<BillingSubscriptionDto>('/api/billing/subscription'),
    staleTime: 30 * 1000,
  });
}
