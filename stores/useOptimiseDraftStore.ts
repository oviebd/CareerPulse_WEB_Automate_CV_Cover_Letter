import { create } from 'zustand';
import type { DraftResult } from '@/types';

const STORAGE_KEY = 'optimise_draft_v1';

interface OptimiseDraftState {
  draft: DraftResult | null;
  setDraft: (draft: DraftResult | null) => void;
  clearDraft: () => void;
}

function readStoredDraft(): DraftResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftResult;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredDraft(draft: DraftResult | null) {
  if (typeof window === 'undefined') return;
  try {
    if (draft) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* quota / private mode */
  }
}

export const useOptimiseDraftStore = create<OptimiseDraftState>((set) => ({
  draft: readStoredDraft(),
  setDraft: (draft) => {
    writeStoredDraft(draft);
    set({ draft });
  },
  clearDraft: () => {
    writeStoredDraft(null);
    set({ draft: null });
  },
}));
