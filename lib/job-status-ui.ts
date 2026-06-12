import type { JobStatus } from '@/types/database';

/** Five UI columns shown on the application board */
export type ApplicationColumn =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'closed';

export const APPLICATION_COLUMNS: ApplicationColumn[] = [
  'saved',
  'applied',
  'interviewing',
  'offer',
  'closed',
];

export const APPLICATION_COLUMN_CONFIG: Record<
  ApplicationColumn,
  {
    label: string;
    emoji: string;
    bgColor: string;
    textColor: string;
    borderClass: string;
  }
> = {
  saved: {
    label: 'Saved',
    emoji: '📌',
    bgColor: 'bg-blue-50 dark:bg-blue-950/45',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-200',
  },
  applied: {
    label: 'Applied',
    emoji: '✅',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/45',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderClass:
      'border-indigo-500 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200',
  },
  interviewing: {
    label: 'Interviewing',
    emoji: '🗣',
    bgColor: 'bg-amber-50 dark:bg-amber-950/45',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderClass:
      'border-amber-500 text-amber-800 dark:border-amber-400 dark:text-amber-200',
  },
  offer: {
    label: 'Offer',
    emoji: '🎉',
    bgColor: 'bg-green-50 dark:bg-green-950/45',
    textColor: 'text-green-700 dark:text-green-300',
    borderClass:
      'border-green-500 text-green-800 dark:border-green-400 dark:text-green-200',
  },
  closed: {
    label: 'Closed',
    emoji: '✖',
    bgColor: 'bg-slate-100 dark:bg-slate-900/50',
    textColor: 'text-slate-600 dark:text-slate-400',
    borderClass:
      'border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-300',
  },
};

/** DB statuses grouped under each UI column */
export const COLUMN_DB_STATUSES: Record<ApplicationColumn, JobStatus[]> = {
  saved: ['apply_later'],
  applied: ['applied'],
  interviewing: ['interviewing', 'technical_test'],
  offer: ['offer_received', 'negotiating', 'offered'],
  closed: ['rejected', 'withdrawn', 'ghosted'],
};

export function jobStatusToColumn(status: JobStatus): ApplicationColumn | null {
  if (status === 'none') return null;
  for (const col of APPLICATION_COLUMNS) {
    if (COLUMN_DB_STATUSES[col].includes(status)) return col;
  }
  return 'saved';
}

/** Default DB status when user picks a UI column */
export function columnToDefaultStatus(column: ApplicationColumn): JobStatus {
  return COLUMN_DB_STATUSES[column][0];
}

export function columnLabel(column: ApplicationColumn): string {
  return APPLICATION_COLUMN_CONFIG[column].label;
}
