'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ReadinessBreakdown } from '@/types/interview';

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 600;
    const tick = (ts: number) => {
      const p = Math.min(1, (ts - start) / duration);
      setDisplay(Math.round(value * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return (
    <span className="font-display text-3xl font-bold tabular-nums text-[var(--color-text-primary)] md:text-4xl">
      {display}
      <span className="text-lg text-[var(--color-primary)] md:text-xl">%</span>
    </span>
  );
}

type Props = {
  readiness: ReadinessBreakdown;
  jobTitle: string;
  companyName?: string;
  actions?: ReactNode;
  nav?: ReactNode;
};

export function PrepProgressHero({ readiness, jobTitle, companyName, actions, nav }: Props) {
  return (
    <Card
      className="relative overflow-hidden border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary-100)]/60 via-[var(--color-surface)] to-[var(--color-surface)]"
      padding="md"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
        style={{ background: 'var(--color-accent-mint)' }}
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold tracking-tight text-[var(--color-text-primary)] md:text-2xl">
              {jobTitle}
            </h1>
            {companyName ? (
              <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{companyName}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        <div className="border-t border-[var(--color-border)]/60 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Interview progress
            </p>
            <CountUp value={readiness.overall} />
          </div>

          <Progress value={readiness.overall} className="mt-2 h-2" />
        </div>

        {nav}

        <motion.div
          className="flex items-center gap-2 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/50 px-2.5 py-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1 }}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary-400)]" />
          <p className="text-xs leading-snug text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-primary-400)]">Next up: </span>
            {readiness.next_action}
          </p>
        </motion.div>
      </div>
    </Card>
  );
}
