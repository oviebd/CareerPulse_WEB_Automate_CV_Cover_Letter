import { create } from 'zustand';
import type { CVEditorState } from '@/lib/cv-editor-state';
import { DEFAULT_EDITOR_STATE } from '@/lib/cv-editor-state';

interface GuestCvStore {
  /** In-memory only — no persist middleware. */
  guestEditorState: CVEditorState | null;
  setGuestEditorState: (s: CVEditorState) => void;
  clearGuestCv: () => void;
  hasGuestCv: () => boolean;
}

export const useGuestCvStore = create<GuestCvStore>((set, get) => ({
  guestEditorState: null,
  setGuestEditorState: (s) => set({ guestEditorState: s }),
  clearGuestCv: () => set({ guestEditorState: null }),
  hasGuestCv: () => get().guestEditorState !== null,
}));

export function useGuestCv() {
  const guestEditorState = useGuestCvStore((s) => s.guestEditorState);
  const setGuestEditorState = useGuestCvStore((s) => s.setGuestEditorState);
  const clearGuestCv = useGuestCvStore((s) => s.clearGuestCv);
  const hasGuestCv = useGuestCvStore((s) => s.hasGuestCv);
  return { guestEditorState, setGuestEditorState, clearGuestCv, hasGuestCv, DEFAULT_EDITOR_STATE };
}
