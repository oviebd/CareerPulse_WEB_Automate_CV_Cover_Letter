'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeUp } from '@/lib/animations';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...(reduce ? {} : fadeUp)}
      className="rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary-50)] to-[var(--color-primary-100)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary-700)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </motion.div>
  );
}
