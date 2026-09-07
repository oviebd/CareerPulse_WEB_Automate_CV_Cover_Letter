import { getTemplatesRepo } from '@/lib/db/repositories/templates';
import type { SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

const premiumCache = new Map<string, { isPremium: boolean; tiers: string[]; expires: number }>();
const CACHE_TTL_MS = 60_000;

async function getTemplateMeta(templateId: string) {
  const cached = premiumCache.get(templateId);
  if (cached && cached.expires > Date.now()) return cached;

  const tmpl = await getTemplatesRepo().getById(templateId);
  const meta = {
    isPremium: tmpl?.is_premium ?? false,
    tiers: (tmpl?.available_tiers ?? ['free', 'pro']) as string[],
    expires: Date.now() + CACHE_TTL_MS,
  };
  premiumCache.set(templateId, meta);
  return meta;
}

export async function isPremiumTemplateId(templateId: string): Promise<boolean> {
  const meta = await getTemplateMeta(templateId);
  return meta.isPremium;
}

export async function assertTemplateAccess(
  templateId: string,
  userTier: SubscriptionTier
): Promise<void> {
  const meta = await getTemplateMeta(templateId);
  if (!canUseTemplate(meta.tiers, userTier)) {
    throw new Error('TEMPLATE_FORBIDDEN');
  }
}

export function clearTemplateAccessCache() {
  premiumCache.clear();
}
