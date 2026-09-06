'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { fadeUp } from '@/lib/animations';
import type { PrepTab } from '@/components/interview/prep-tabs';

type Props = {
  tab: PrepTab;
  children: React.ReactNode;
};

export function PrepTabPanel({ tab, children }: Props) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevTab = useRef(tab);

  useEffect(() => {
    if (prevTab.current !== tab && panelRef.current && window.innerWidth < 768) {
      panelRef.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }
    prevTab.current = tab;
  }, [tab, reduce]);

  return (
    <div ref={panelRef} className="scroll-mt-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? false : fadeUp.initial}
          animate={fadeUp.animate}
          exit={reduce ? undefined : fadeUp.exit}
          transition={fadeUp.transition}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
