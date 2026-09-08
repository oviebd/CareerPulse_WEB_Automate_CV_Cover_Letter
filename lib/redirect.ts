import type { NextRequest } from 'next/server';

const UNUSABLE_HOSTS = new Set(['0.0.0.0', '::']);

/** Prevent open redirects: only same-origin paths starting with `/`. */
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') return '/dashboard';
  const trimmed = next.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/dashboard';
  return trimmed;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function configuredOrigin(): string | null {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) return trimTrailingSlash(authUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return trimTrailingSlash(appUrl);
  return null;
}

function firstHeaderValue(value: string | null): string {
  if (!value) return '';
  return value.split(',')[0]?.trim() ?? '';
}

function hostName(hostHeader: string): string {
  const host = firstHeaderValue(hostHeader);
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end !== -1) return host.slice(1, end);
    return host;
  }
  return host.split(':')[0] ?? host;
}

function isUsableHost(hostHeader: string): boolean {
  const name = hostName(hostHeader);
  return Boolean(name) && !UNUSABLE_HOSTS.has(name);
}

function forwardedProto(request: NextRequest): string {
  const forwarded = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  if (forwarded === 'http' || forwarded === 'https') return forwarded;
  const protocol = request.nextUrl.protocol.replace(':', '');
  return protocol === 'https' ? 'https' : 'http';
}

/**
 * Public origin for server redirects. Avoids Docker listen addresses like 0.0.0.0
 * by preferring the incoming Host / X-Forwarded-Proto, then AUTH_URL / NEXT_PUBLIC_APP_URL.
 */
export function publicAppOrigin(request: NextRequest): string {
  const hostHeader = request.headers.get('host');
  if (hostHeader && isUsableHost(hostHeader)) {
    return `${forwardedProto(request)}://${firstHeaderValue(hostHeader)}`;
  }

  const configured = configuredOrigin();
  if (configured) return configured;

  return 'http://localhost:3000';
}

export function publicAppUrl(request: NextRequest, path: string): URL {
  return new URL(path, publicAppOrigin(request));
}
