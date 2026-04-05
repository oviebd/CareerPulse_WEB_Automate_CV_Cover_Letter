import type { AppliedJobTrackStatus, JobStatus } from '@/types/database';

/** Maps granular `applied_jobs.status` to `jobs.status` (kanban columns). */
export function mapTrackStatusToJobBoardStatus(
  s: AppliedJobTrackStatus
): JobStatus {
  switch (s) {
    case 'apply_later':
    case 'saved':
      return 'saved';
    case 'technical_test':
      return 'interviewing';
    case 'offer_received':
    case 'negotiating':
    case 'offered':
      return 'offered';
    case 'ghosted':
      return 'rejected';
    case 'applied':
      return 'applied';
    case 'interviewing':
      return 'interviewing';
    case 'rejected':
      return 'rejected';
    case 'withdrawn':
      return 'withdrawn';
    default: {
      const _u: never = s;
      return _u;
    }
  }
}

export function isAppliedJobTrackStatus(
  s: string
): s is AppliedJobTrackStatus {
  return (
    s === 'apply_later' ||
    s === 'applied' ||
    s === 'interviewing' ||
    s === 'technical_test' ||
    s === 'offer_received' ||
    s === 'negotiating' ||
    s === 'rejected' ||
    s === 'withdrawn' ||
    s === 'ghosted' ||
    s === 'saved' ||
    s === 'offered'
  );
}
