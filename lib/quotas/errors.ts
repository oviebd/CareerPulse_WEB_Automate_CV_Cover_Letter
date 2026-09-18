import type { QuotaMetric } from '@/lib/quotas/catalog';

export class QuotaExceededError extends Error {
  constructor(
    public metric: QuotaMetric,
    public limit: number,
    public used: number,
    public remaining: number
  ) {
    super('QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
  }
}
