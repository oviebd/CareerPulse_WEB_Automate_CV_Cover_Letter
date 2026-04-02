'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ATSCircularScoreProps {
  score: number;
  suggestions?: string[];
  className?: string;
}

export function ATSCircularScore({
  score,
  suggestions = [],
  className,
}: ATSCircularScoreProps) {
  const [expanded, setExpanded] = useState(false);

  // SVG dimensions
  const size = 100;
  const strokeWidth = 8;
  const radius = 42; // Decreased to ensure 8px stroke stays within 100x100
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-[var(--color-accent-mint)]';
    if (s >= 50) return 'text-[var(--color-accent-gold)]';
    return 'text-red-500';
  };

  const getScoreStroke = (s: number) => {
    if (s >= 80) return 'var(--color-accent-mint)';
    if (s >= 50) return 'var(--color-accent-gold)';
    return '#ef4444';
  };

  return (
    <div className={cn(
      "glass-panel relative flex flex-col items-center rounded-card border border-[var(--color-border)] p-5 shadow-xl backdrop-blur-xl",
      className
    )}>
      {/* Header with Circular Progress */}
      <div className="flex w-full items-center justify-between gap-6">
        <div className="relative h-[90px] w-[90px] shrink-0">
          <svg className="h-full w-full -rotate-90 overflow-visible">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="white"
              strokeOpacity="0.05"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={getScoreStroke(score)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-2xl font-black tabular-nums", getScoreColor(score))}>
              {score}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
              Score
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
            ATS Impact Report
          </h3>
          <p className="text-xs leading-relaxed text-[var(--color-muted)]">
            {score >= 80 
              ? "Your CV is highly optimized for applicant tracking systems." 
              : "A few minor adjustments can significantly improve your interview chances."}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-fit gap-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-400)] hover:bg-[var(--color-primary-100)]"
          >
            {expanded ? "Hide Suggestions" : "Show Suggestions"}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Suggestions List */}
      <AnimatePresence>
        {expanded && suggestions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-3 rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-mint)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Critical Fixes found
                </span>
              </div>
              <ul className="space-y-2.5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-[11.5px] leading-relaxed text-[var(--color-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary-400)] opacity-70" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
