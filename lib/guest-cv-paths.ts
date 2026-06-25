/**
 * App paths that require an authenticated user (aligned with middleware + AuthProvider).
 */
const STATIC_PROTECTED: readonly string[] = [
  '/dashboard',
  '/cover-letters',
  '/tracker',
  '/ai-tools',
  '/settings',
];

export function isProtectedAppPath(pathname: string): boolean {
  if (STATIC_PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith('/cv')) {
    return true;
  }
  return false;
}
