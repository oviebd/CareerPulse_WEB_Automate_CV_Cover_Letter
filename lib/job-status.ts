import type { JobStatus } from '@/types/database';

const VALUES: readonly JobStatus[] = [
  'none',
  'apply_later',
  'applied',
  'interviewing',
  'technical_test',
  'offer_received',
  'negotiating',
  'offered',
  'rejected',
  'withdrawn',
  'ghosted',
] as const;

export function isJobStatus(s: string): s is JobStatus {
  return (VALUES as readonly string[]).includes(s);
}

/** Statuses that can be set when tracking (excludes `none`). */
export const TRACKABLE_JOB_STATUSES: Exclude<JobStatus, 'none'>[] = [
  'apply_later',
  'applied',
  'interviewing',
  'technical_test',
  'offer_received',
  'negotiating',
  'offered',
  'rejected',
  'withdrawn',
  'ghosted',
];
