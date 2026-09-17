import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/lib/auth/roles', () => ({
  ensureSuperAdminRole: vi.fn(),
  resolveUserRole: vi.fn(),
}));

vi.mock('@/lib/db/repositories/profiles', () => ({
  getProfilesRepo: vi.fn(),
}));

vi.mock('@/lib/credits/grant', () => ({
  ensureUserCredits: vi.fn(),
}));

import { getSessionUser } from '@/lib/auth/session';
import { ensureSuperAdminRole, resolveUserRole } from '@/lib/auth/roles';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { ensureUserCredits } from '@/lib/credits/grant';
import { GET } from '@/app/api/me/route';

describe('GET /api/me', () => {
  beforeEach(() => {
    vi.mocked(getSessionUser).mockReset();
    vi.mocked(ensureSuperAdminRole).mockReset();
    vi.mocked(resolveUserRole).mockReset();
    vi.mocked(getProfilesRepo).mockReset();
    vi.mocked(ensureUserCredits).mockReset();
  });

  it('returns 200 with null user when unauthenticated', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: null, profile: null, credits: null });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns 200 with null user when getSessionUser throws', async () => {
    vi.mocked(getSessionUser).mockRejectedValue(new Error('db unreachable'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ user: null, profile: null, credits: null });
  });

  it('returns 200 with null user when app user is missing or inactive', async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(body.user).toBeNull();
  });

  it('returns 200 with partial payload when enrichment fails after valid app user', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'user-1',
      email: 'a@test.com',
    });
    vi.mocked(ensureSuperAdminRole).mockRejectedValue(new Error('db down'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: 'user-1',
      email: 'a@test.com',
      role: 'user',
    });
    expect(body.profile).toBeNull();
    expect(body.credits).toBeNull();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('returns enriched payload when session and db succeed', async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: 'user-1',
      email: 'a@test.com',
    });
    vi.mocked(ensureSuperAdminRole).mockResolvedValue(undefined);
    vi.mocked(resolveUserRole).mockResolvedValue('user');
    vi.mocked(ensureUserCredits).mockResolvedValue(42);
    vi.mocked(getProfilesRepo).mockReturnValue({
      getById: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@test.com' }),
    } as unknown as ReturnType<typeof getProfilesRepo>);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toMatchObject({ id: 'user-1', email: 'a@test.com', role: 'user' });
    expect(body.credits).toEqual({ balance: 42 });
    expect(body.profile).toMatchObject({ id: 'user-1' });
  });
});
