import { auth } from '@/lib/auth';
import { getUsersRepo } from '@/lib/db/repositories/users';

export type AppSessionUser = {
  id: string;
  email: string;
};

/** Resolve the authenticated user for API routes and server components. */
export async function getSessionUser(): Promise<AppSessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) return null;

  const row = await getUsersRepo().findById(id);
  if (!row || row.is_active === false) return null;

  return { id, email };
}

export async function requireSessionUser(): Promise<AppSessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}
