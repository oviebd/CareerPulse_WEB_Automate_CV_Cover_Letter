'use client';

import type { ReactNode } from 'react';

/**
 * Route changes used to animate from opacity 0, which hid the new page until the
 * animation finished and felt laggy. Content swaps instantly; prefer route `loading.tsx` for spinners.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
