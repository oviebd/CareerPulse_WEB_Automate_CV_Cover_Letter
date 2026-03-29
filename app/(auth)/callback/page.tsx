import { Suspense } from 'react';
import CallbackClient from './callback-client';

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-muted)]">
          Loading…
        </div>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
