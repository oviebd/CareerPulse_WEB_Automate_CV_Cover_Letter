import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import type { Profile } from '@/types';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setInitialized: (value: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ user: null, profile: null, initialized: true }),
}));
