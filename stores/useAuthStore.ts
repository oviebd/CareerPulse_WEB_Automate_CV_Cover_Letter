export type AppUser = {
  id: string;
  email: string;
  role?: 'user' | 'super_admin';
};

export interface AuthState {
  user: AppUser | null;
  profile: import('@/types').Profile | null;
  initialized: boolean;
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: import('@/types').Profile | null) => void;
  setInitialized: (value: boolean) => void;
  reset: () => void;
}

import { create } from 'zustand';
import type { Profile } from '@/types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ user: null, profile: null, initialized: true }),
}));

export type { Profile };
