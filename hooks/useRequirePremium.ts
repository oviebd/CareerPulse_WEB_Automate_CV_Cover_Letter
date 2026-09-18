'use client';

import { useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUIStore, type GoPremiumFeature } from '@/stores/useUIStore';

export function useRequirePremium() {
  const { isPremium } = useSubscription();
  const openGoPremium = useUIStore((s) => s.openGoPremium);

  const requirePremium = useCallback(
    (feature: GoPremiumFeature, action: () => void) => {
      if (isPremium) {
        action();
        return true;
      }
      openGoPremium(feature);
      return false;
    },
    [isPremium, openGoPremium]
  );

  return { isPremium, requirePremium, openGoPremium };
}
