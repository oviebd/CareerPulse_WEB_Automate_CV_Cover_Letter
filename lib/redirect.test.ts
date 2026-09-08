import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { publicAppOrigin, publicAppUrl } from '@/lib/redirect';

function makeRequest(
  url: string,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, { headers });
}

describe('publicAppOrigin', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('falls back to NEXT_PUBLIC_APP_URL when Host is 0.0.0.0', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    delete process.env.AUTH_URL;

    const request = makeRequest('http://0.0.0.0:3000/api/auth/signout?redirect=/', {
      host: '0.0.0.0:3000',
    });

    expect(publicAppOrigin(request)).toBe('https://app.example.com');
  });

  it('uses localhost host in local dev', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.AUTH_URL;

    const request = makeRequest('http://localhost:3000/api/auth/signout?redirect=/', {
      host: 'localhost:3000',
    });

    expect(publicAppOrigin(request)).toBe('http://localhost:3000');
  });

  it('uses X-Forwarded-Proto with a public host', () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.AUTH_URL;

    const request = makeRequest('http://127.0.0.1:3000/api/auth/signout?redirect=/', {
      host: 'app.example.com',
      'x-forwarded-proto': 'https',
    });

    expect(publicAppOrigin(request)).toBe('https://app.example.com');
  });

  it('builds redirect URLs from the resolved origin', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

    const request = makeRequest('http://0.0.0.0:3000/api/auth/signout?redirect=/', {
      host: '0.0.0.0:3000',
    });

    expect(publicAppUrl(request, '/').toString()).toBe('https://app.example.com/');
  });
});
