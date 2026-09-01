import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { toSnake } from '@/lib/db/map-row';

export type SessionUser = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

async function findByEmail(email: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return row ? toSnake(row) : null;
}

async function findByGoogleId(googleId: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return row ? toSnake(row) : null;
}

async function findById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ? toSnake(row) : null;
}

async function create(input: {
  email: string;
  passwordHash?: string | null;
  googleId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: Date | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash ?? null,
      googleId: input.googleId ?? null,
      fullName: input.fullName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      emailVerified: input.emailVerified ?? null,
    })
    .returning();
  return toSnake(row);
}

async function update(id: string, patch: Record<string, unknown>) {
  const db = getDb();
  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  return row ? toSnake(row) : null;
}

async function remove(id: string) {
  const db = getDb();
  await db.delete(users).where(eq(users.id, id));
}

export function getUsersRepo() {
  return { findByEmail, findByGoogleId, findById, create, update, remove };
}
