'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function CVEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('CV editor error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-6">
      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        Could not load the CV editor
      </h2>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        {error.message || 'Something went wrong while opening this CV.'}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
