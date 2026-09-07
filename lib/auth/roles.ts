import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { getUsersRepo } from '@/lib/db/repositories/users';
import type { UserRole } from '@/types';

export function getSuperAdminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim() ?? '';
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getSuperAdminEmails().has(email.trim().toLowerCase());
}

export async function resolveUserRole(userId: string): Promise<UserRole> {
  const row = (await getUsersRepo().findById(userId)) as { role?: string } | null;
  return row?.role === 'super_admin' ? 'super_admin' : 'user';
}

export async function requireSuperAdmin(): Promise<
  { id: string; email: string; role: 'super_admin' } | NextResponse
> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = await resolveUserRole(user.id);
  if (role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { ...user, role: 'super_admin' };
}

export async function ensureSuperAdminRole(userId: string, email: string): Promise<void> {
  if (!isSuperAdminEmail(email)) return;
  const role = await resolveUserRole(userId);
  if (role === 'super_admin') return;
  await getUsersRepo().update(userId, { role: 'super_admin' });
}
