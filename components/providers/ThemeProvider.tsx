'use client';

import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';

/** Syncs Zustand theme ↔ `data-theme` on `<html>` (persistence handled in store). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
