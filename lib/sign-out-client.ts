export const SIGNING_OUT_STORAGE_KEY = 'cp_signing_out';

export function isAuthSessionMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string };
  return e.name === 'AuthSessionMissingError' || e.message === 'Auth session missing!';
}

export function isClientSigningOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SIGNING_OUT_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearClientSigningOutFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SIGNING_OUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Navigate away immediately; server clears cookies and redirects to home. */
export function signOutAndGoHome(): void {
  try {
    sessionStorage.setItem(SIGNING_OUT_STORAGE_KEY, '1');
    sessionStorage.removeItem('cp_profile');
  } catch {
    // ignore
  }

  window.location.replace('/api/auth/signout?redirect=/');
}
