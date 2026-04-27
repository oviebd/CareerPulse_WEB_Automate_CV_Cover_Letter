import { useAuthStore } from '@/stores/useAuthStore';

let redirecting = false;

function handleUnauthorized() {
  if (redirecting) return;
  redirecting = true;
  useAuthStore.getState().reset();
  if (typeof window !== 'undefined') {
    const returnTo = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnTo=${returnTo}`;
  }
}

/**
 * Thin wrapper around `fetch` that intercepts 401 responses.
 * When any API route returns 401, clears auth state and redirects to login.
 * Use this for internal `/api/*` calls to get automatic session-expiry handling.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    handleUnauthorized();
  }
  return res;
}

/**
 * Detect whether a react-query error originated from a 401 response.
 * Works for both plain fetch errors and Supabase PostgREST errors.
 */
export function isUnauthorizedError(error: unknown): boolean {
  if (!error) return false;

  // Supabase PostgREST errors carry a numeric `code` or `status`
  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;
    if (e.status === 401 || e.code === 401) return true;
    if (typeof e.message === 'string') {
      const m = e.message.toLowerCase();
      if (m.includes('jwt expired') || m.includes('invalid jwt') || m.includes('not authenticated')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Call this from a global react-query error handler.
 * If the error signals an expired / invalid session, reset auth and redirect.
 */
export function handleQueryAuthError(error: unknown): void {
  if (isUnauthorizedError(error)) {
    handleUnauthorized();
  }
}
