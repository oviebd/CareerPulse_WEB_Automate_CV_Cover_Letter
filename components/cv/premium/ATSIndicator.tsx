'use client';

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface ATSIndicatorProps {
  score: number;
  previousScore: number;
}

function getLabel(score: number): string {
  if (score >= 85) return 'Interview Ready';
  if (score >= 65) return 'Strong';
  return 'Beginner';
}

export function ATSIndicator({ score, previousScore }: ATSIndicatorProps) {
  const delta = score - previousScore;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ATS Score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{score}/100</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {getLabel(score)}
        </span>
      </div>
      <Progress value={score} className="mt-3 h-2.5 bg-slate-100" colorClass="bg-emerald-500 transition-all duration-500" />
      {delta > 0 ? (
        <motion.p
          key={score}
          initial={{ y: 4, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-2 text-xs font-medium text-emerald-600"
        >
          +{delta} ATS Score - Great! Added measurable impact
        </motion.p>
      ) : null}
    </div>
  );
}
