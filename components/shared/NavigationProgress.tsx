'use client';

import { useUIStore } from '@/stores/useUIStore';

/** Thin indeterminate bar while a sidebar / nav link navigation is in flight. */
export function NavigationProgress() {
  const pending = useUIStore((s) => s.pendingNavHref);
  if (!pending) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-[var(--color-primary-400)]/15"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div
        className="h-full w-[42%] bg-[var(--color-primary-500)] shadow-[0_0_12px_var(--color-primary-400)]"
        style={{
          animation: 'nav-progress 0.95s ease-in-out infinite',
        }}
      />
    </div>
  );
}
