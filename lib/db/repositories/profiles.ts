import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { toSnake } from '@/lib/db/map-row';
import type { Profile } from '@/types';

type ProfilePatch = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'is_onboarded'
    | 'preferred_cl_template_id'
    | 'subscription_tier'
    | 'subscription_status'
    | 'subscription_expires_at'
    | 'promo_code_used'
  >
>;

async function getById(userId: string): Promise<Profile | null> {
  const db = getDb();
  const [row] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return row ? (toSnake(row) as unknown as Profile) : null;
}

async function update(userId: string, patch: ProfilePatch): Promise<Profile> {
  const db = getDb();
  const dbPatch: Record<string, unknown> = {};
  if (patch.full_name !== undefined) dbPatch.fullName = patch.full_name;
  if (patch.is_onboarded !== undefined) dbPatch.isOnboarded = patch.is_onboarded;
  if (patch.preferred_cl_template_id !== undefined) {
    dbPatch.preferredClTemplateId = patch.preferred_cl_template_id;
  }
  if (patch.subscription_tier !== undefined) dbPatch.subscriptionTier = patch.subscription_tier;
  if (patch.subscription_status !== undefined) dbPatch.subscriptionStatus = patch.subscription_status;
  if (patch.subscription_expires_at !== undefined) {
    dbPatch.subscriptionExpiresAt =
      patch.subscription_expires_at == null
        ? null
        : new Date(patch.subscription_expires_at);
  }
  dbPatch.updatedAt = new Date();
  if (patch.promo_code_used !== undefined) dbPatch.promoCodeUsed = patch.promo_code_used;
  const [row] = await db.update(profiles).set(dbPatch).where(eq(profiles.id, userId)).returning();
  if (!row) throw new Error('Profile not found');
  return toSnake(row) as unknown as Profile;
}

async function createProfile(input: {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
}): Promise<Profile> {
  const db = getDb();
  const [row] = await db
    .insert(profiles)
    .values({
      id: input.id,
      email: input.email,
      fullName: input.full_name ?? null,
      avatarUrl: input.avatar_url ?? null,
    })
    .returning();
  return toSnake(row) as unknown as Profile;
}

export function getProfilesRepo() {
  return { getById, update, createProfile, updateAdmin: (id: string, p: ProfilePatch) => update(id, p) };
}
