const SESSION_KEY = 'cv_preview_expanded';

/** Default collapsed unless user expanded preview this session. */
export function readPreviewCollapsedDefault(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

export function persistPreviewExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (expanded) sessionStorage.setItem(SESSION_KEY, '1');
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
