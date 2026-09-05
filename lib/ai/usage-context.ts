import { AsyncLocalStorage } from 'node:async_hooks';

export type AiUsageCategory =
  | 'cv_creation'
  | 'cover_letter'
  | 'job_specific_cv'
  | 'ai_suggestions'
  | 'job_analysis'
  | 'interview_prep';

export type AiUsageContext = {
  userId?: string;
  category?: AiUsageCategory;
  operation?: string;
  relatedId?: string;
};

const storage = new AsyncLocalStorage<AiUsageContext>();

export function getAiUsageContext(): AiUsageContext {
  return storage.getStore() ?? {};
}

export function runWithAiUsageContext<T>(ctx: AiUsageContext, fn: () => T): T {
  const parent = storage.getStore() ?? {};
  return storage.run({ ...parent, ...ctx }, fn);
}

export function setAiUsageContext(patch: Partial<AiUsageContext>): void {
  const store = storage.getStore();
  if (store) Object.assign(store, patch);
}
