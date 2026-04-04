import { create } from 'zustand';
import type { DraftResult } from '@/types';

interface OptimiseDraftState {
  draft: DraftResult | null;
  setDraft: (draft: DraftResult | null) => void;
  clearDraft: () => void;
}

export const useOptimiseDraftStore = create<OptimiseDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: null }),
}));
