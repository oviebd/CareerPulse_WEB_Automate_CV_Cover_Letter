import type { CVEditorState } from '@/lib/cv-editor-state';

export const GUEST_CV_PENDING_KEY = 'guestCvPending';

export function stashGuestEditorStateForOAuth(state: CVEditorState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(GUEST_CV_PENDING_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function takeGuestEditorStateFromSessionStorage(): CVEditorState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(GUEST_CV_PENDING_KEY);
  if (!raw) return null;
  try {
    window.sessionStorage.removeItem(GUEST_CV_PENDING_KEY);
  } catch {
    /* ignore */
  }
  try {
    return JSON.parse(raw) as CVEditorState;
  } catch {
    return null;
  }
}
