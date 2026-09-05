import { runWithAiUsageContext, type AiUsageCategory } from '@/lib/ai/usage-context';

type AiRouteContext = {
  category?: AiUsageCategory;
  relatedId?: string;
};

/** Wrap an authenticated API handler with user AI usage context. */
export async function withAiUserRoute<T>(
  userId: string,
  fn: () => Promise<T>,
  ctx?: AiRouteContext
): Promise<T> {
  return runWithAiUsageContext({ userId, ...ctx }, fn);
}

export async function withInterviewAiRoute<T>(
  userId: string,
  profileId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return withAiUserRoute(userId, fn, {
    category: 'interview_prep',
    relatedId: profileId,
  });
}
