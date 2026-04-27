'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Ensures /#id scrolls to the target after client-side nav from other routes. */
export function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/') return;
    const hash = window.location.hash;
    if (hash.length < 2) return;
    const id = decodeURIComponent(hash.slice(1));
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
