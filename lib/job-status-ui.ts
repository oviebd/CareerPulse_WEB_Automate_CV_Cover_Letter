import type { JobStatus } from '@/types/database';

/** Seven UI columns shown on the Kanban board */
export type KanbanColumn =
  | 'wishlist'
  | 'applied'
  | 'interview'
  | 'assessment'
  | 'offer'
  | 'rejected'
  | 'archived';

/** @deprecated use KanbanColumn */
export type ApplicationColumn = KanbanColumn;

export const KANBAN_COLUMNS: KanbanColumn[] = [
  'wishlist',
  'applied',
  'interview',
  'assessment',
  'offer',
  'rejected',
  'archived',
];

/** @deprecated use KANBAN_COLUMNS */
export const APPLICATION_COLUMNS = KANBAN_COLUMNS;

export type KanbanColumnConfig = {
  label: string;
  emoji: string;
  bgColor: string;
  textColor: string;
  borderClass: string;
  dropHighlight: string;
};

export const KANBAN_COLUMN_CONFIG: Record<KanbanColumn, KanbanColumnConfig> = {
  wishlist: {
    label: 'Wishlist',
    emoji: '⭐',
    bgColor: 'bg-blue-50 dark:bg-blue-950/45',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-200',
    dropHighlight: 'ring-2 ring-blue-400/60 bg-blue-50/80 dark:bg-blue-900/30',
  },
  applied: {
    label: 'Applied',
    emoji: '✅',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/45',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-500 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200',
    dropHighlight: 'ring-2 ring-indigo-400/60 bg-indigo-50/80 dark:bg-indigo-900/30',
  },
  interview: {
    label: 'Interview',
    emoji: '🗣️',
    bgColor: 'bg-violet-50 dark:bg-violet-950/45',
    textColor: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-500 text-violet-800 dark:border-violet-400 dark:text-violet-200',
    dropHighlight: 'ring-2 ring-violet-400/60 bg-violet-50/80 dark:bg-violet-900/30',
  },
  assessment: {
    label: 'Assessment',
    emoji: '📝',
    bgColor: 'bg-amber-50 dark:bg-amber-950/45',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500 text-amber-800 dark:border-amber-400 dark:text-amber-200',
    dropHighlight: 'ring-2 ring-amber-400/60 bg-amber-50/80 dark:bg-amber-900/30',
  },
  offer: {
    label: 'Offer',
    emoji: '🎉',
    bgColor: 'bg-green-50 dark:bg-green-950/45',
    textColor: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-500 text-green-800 dark:border-green-400 dark:text-green-200',
    dropHighlight: 'ring-2 ring-green-400/60 bg-green-50/80 dark:bg-green-900/30',
  },
  rejected: {
    label: 'Rejected',
    emoji: '✖️',
    bgColor: 'bg-red-50 dark:bg-red-950/45',
    textColor: 'text-red-600 dark:text-red-400',
    borderClass: 'border-red-400 text-red-700 dark:border-red-500 dark:text-red-300',
    dropHighlight: 'ring-2 ring-red-400/60 bg-red-50/80 dark:bg-red-900/30',
  },
  archived: {
    label: 'Archived',
    emoji: '📦',
    bgColor: 'bg-slate-100 dark:bg-slate-900/50',
    textColor: 'text-slate-500 dark:text-slate-400',
    borderClass: 'border-slate-400 text-slate-600 dark:border-slate-500 dark:text-slate-300',
    dropHighlight: 'ring-2 ring-slate-400/60 bg-slate-100/80 dark:bg-slate-800/30',
  },
};

/** @deprecated use KANBAN_COLUMN_CONFIG */
export const APPLICATION_COLUMN_CONFIG = KANBAN_COLUMN_CONFIG;

/** DB statuses grouped under each UI column */
export const COLUMN_DB_STATUSES: Record<KanbanColumn, JobStatus[]> = {
  wishlist:   ['apply_later', 'none'],
  applied:    ['applied'],
  interview:  ['interviewing'],
  assessment: ['technical_test'],
  offer:      ['offer_received', 'negotiating', 'offered'],
  rejected:   ['rejected', 'withdrawn', 'ghosted'],
  archived:   ['archived'],
};

export function jobStatusToColumn(status: JobStatus): KanbanColumn | null {
  for (const col of KANBAN_COLUMNS) {
    if (COLUMN_DB_STATUSES[col].includes(status)) return col;
  }
  return null;
}

/** Default DB status when user drops a card into a column */
export function columnToDefaultStatus(column: KanbanColumn): JobStatus {
  return COLUMN_DB_STATUSES[column][0];
}

export function columnLabel(column: KanbanColumn): string {
  return KANBAN_COLUMN_CONFIG[column].label;
}
