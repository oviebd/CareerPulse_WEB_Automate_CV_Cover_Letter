'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function StatCard({
  label,
  value,
  accent = 'var(--color-primary-500)',
  helper,
}: {
  label: string;
  value: number;
  accent?: string;
  helper?: string;
}) {
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
    <motion.div
      className="relative overflow-hidden rounded-lg border bg-white/70 p-4 backdrop-blur"
      style={{ borderColor: 'rgba(99,102,241,0.15)' }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{display}</p>
      {helper ? <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helper}</p> : null}
    </motion.div>
  );
}
