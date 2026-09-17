'use client';

import { applyDevSubscriptionOverride } from '@/lib/dev-subscription';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Profile } from '@/types';

export async function refreshCareerPulseSession(): Promise<Profile | null> {
  const res = await fetch('/api/me', { credentials: 'same-origin' });
  const json = (await res.json()) as {
    user: { id: string; email: string; role?: 'user' | 'super_admin' } | null;
    profile: Profile | null;
  };
  if (json.user) {
    useAuthStore.getState().setUser({
      id: json.user.id,
      email: json.user.email,
      role: json.user.role,
    });
  }
  const profile = json.profile ? applyDevSubscriptionOverride(json.profile) : null;
  useAuthStore.getState().setProfile(profile);
  return profile;
}
