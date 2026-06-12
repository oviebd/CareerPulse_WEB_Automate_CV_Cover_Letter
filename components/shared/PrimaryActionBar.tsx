'use client';

import type { ReactNode } from 'react';

export function PrimaryActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">{children}</div>
  );
}
