/**
 * URL paths guests may access for CV (must stay aligned with middleware + AuthProvider).
 */
const CV_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @returns true for CV routes that do not require auth (guests allowed)
 */
export function isGuestPublicCvPath(pathname: string): boolean {
  if (pathname === '/cv/builder') return true;
  if (pathname === '/cv/edit') return true;
  if (pathname === '/cv/templates' || pathname.startsWith('/cv/templates/')) return true;
  if (pathname === '/cv/upload') return true;
  if (pathname.startsWith('/cv/edit/')) {
    const rest = pathname.slice('/cv/edit/'.length);
    const first = rest.split('/')[0] ?? '';
    if (first && CV_UUID_RE.test(first)) return false;
  }
  return false;
}

/**
 * @returns true when the path must have a valid session to access
 */
export function isCvPathProtectedForGuests(pathname: string): boolean {
  if (!pathname.startsWith('/cv')) return false;
  if (isGuestPublicCvPath(pathname)) return false;
  return true;
}

const STATIC_PROTECTED: readonly string[] = [
  '/dashboard',
  '/cover-letters',
  '/tracker',
  '/ai-tools',
  '/settings',
];

/** Aligned with middleware: paths that require an authenticated user. */
export function isProtectedAppPath(pathname: string): boolean {
  if (STATIC_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith('/cv')) {
    return isCvPathProtectedForGuests(pathname);
  }
  return false;
}
