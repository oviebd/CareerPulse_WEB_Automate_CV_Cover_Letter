import NextAuth from 'next-auth';
import { ensureSuperAdminRole, isSuperAdminEmail } from '@/lib/auth/roles';
import { grantInitialCredits } from '@/lib/credits/grant';
import { rateLimitHit } from '@/lib/rate-limit';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers';

function authSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim() || '';
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET or JWT_SECRET must be set in production');
  }
  return 'dev-insecure-auth-secret-change-me';
}

/** Resend/magic-link needs a DB adapter — enable only when one is wired up. */
export function isMagicLinkAuthEnabled(): boolean {
  return false;
}

export function isGoogleAuthEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

function buildAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (isGoogleAuthEnabled()) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  providers.push(
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '').trim().toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;
        if (rateLimitHit(`login:${email}`)) return null;

        const { getUsersRepo } = await import('@/lib/db/repositories/users');
        const { default: bcrypt } = await import('bcryptjs');
        const row = (await getUsersRepo().findByEmail(email)) as {
          id: string;
          email: string;
          password_hash?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
        } | null;
        if (!row?.password_hash) return null;
        if (row.is_active === false) return null;
        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return null;
        return {
          id: row.id,
          email: row.email,
          name: row.full_name ?? undefined,
          image: row.avatar_url ?? undefined,
        };
      },
    })
  );

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret(),
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: '/login',
  },
  providers: buildAuthProviders(),
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return true;
      const { getUsersRepo } = await import('@/lib/db/repositories/users');
      const { getProfilesRepo } = await import('@/lib/db/repositories/profiles');
      const email = user.email.toLowerCase();

      let dbUser = (await getUsersRepo().findByEmail(email)) as {
        id: string;
        is_active?: boolean;
      } | null;
      if (!dbUser && account?.provider === 'google' && account.providerAccountId) {
        dbUser = (await getUsersRepo().create({
          email,
          googleId: account.providerAccountId,
          fullName: user.name ?? null,
          avatarUrl: user.image ?? null,
          emailVerified: new Date(),
        })) as { id: string; is_active?: boolean };
      }
      if (!dbUser?.id) return account?.provider === 'credentials';

      if (dbUser.is_active === false) return false;

      const profile = await getProfilesRepo().getById(dbUser.id);
      if (!profile) {
        await getProfilesRepo().createProfile({
          id: dbUser.id,
          email,
          full_name: user.name ?? null,
          avatar_url: user.image ?? null,
        });
        await grantInitialCredits(dbUser.id);
      }
      await ensureSuperAdminRole(dbUser.id, email);
      user.id = dbUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (token.email && session.user) session.user.email = String(token.email);
      return session;
    },
  },
});

export async function registerWithCredentials(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!email || input.password.length < 8) {
    return { ok: false, error: 'Invalid email or password (min 8 chars)' };
  }
  const { getUsersRepo } = await import('@/lib/db/repositories/users');
  const { getProfilesRepo } = await import('@/lib/db/repositories/profiles');
  const { default: bcrypt } = await import('bcryptjs');
  const existing = await getUsersRepo().findByEmail(email);
  if (existing) return { ok: false, error: 'Email already registered' };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = (await getUsersRepo().create({
    email,
    passwordHash,
    fullName: input.fullName ?? null,
    role: isSuperAdminEmail(email) ? 'super_admin' : 'user',
  })) as { id: string };
  await getProfilesRepo().createProfile({
    id: created.id,
    email,
    full_name: input.fullName ?? null,
  });
  await grantInitialCredits(created.id);
  return { ok: true, userId: created.id };
}
