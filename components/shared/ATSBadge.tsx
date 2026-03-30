'use client';

import { cn } from '@/lib/utils';

function tone(score: number) {
  if (score < 60) return 'bg-red-100 text-red-700 shadow-[0_0_18px_rgba(239,68,68,0.25)]';
  if (score < 80) return 'bg-amber-100 text-amber-700 shadow-[0_0_18px_rgba(245,158,11,0.25)]';
  return 'bg-emerald-100 text-emerald-700 shadow-[0_0_18px_rgba(16,185,129,0.25)]';
}

export function ATSBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tone(score),
        className
      )}
    >
      ATS {score}
    </span>
  );
}
