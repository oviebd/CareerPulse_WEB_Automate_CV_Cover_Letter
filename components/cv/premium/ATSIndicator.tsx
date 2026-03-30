'use client';

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface ATSIndicatorProps {
  score: number;
  previousScore: number;
  /** Top suggestions from the ATS report (shown under the score bar). */
  suggestions?: string[];
}

function getLabel(score: number): string {
  if (score >= 85) return 'Interview Ready';
  if (score >= 65) return 'Strong';
  return 'Beginner';
}

export function ATSIndicator({ score, previousScore, suggestions = [] }: ATSIndicatorProps) {
  const delta = score - previousScore;
  const topSuggestions = suggestions.slice(0, 5);

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
      {topSuggestions.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Suggestions</p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs leading-relaxed text-slate-700">
            {topSuggestions.map((item, i) => (
              <li key={`${i}-${item.slice(0, 40)}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
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
