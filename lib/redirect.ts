/** Prevent open redirects: only same-origin paths starting with `/`. */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') return '/dashboard';
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  return trimmed;
}
