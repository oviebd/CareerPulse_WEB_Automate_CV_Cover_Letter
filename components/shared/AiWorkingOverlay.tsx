'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  title: string;
  messages?: string[];
  className?: string;
};

export function AiWorkingOverlay({ open, title, messages = [], className }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setMessageIndex(0);
      return;
    }
    if (messages.length <= 1) return;

    const timer = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [open, messages]);

  if (!open) return null;

  const subtext = messages.length > 0 ? messages[messageIndex] : undefined;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-6',
        'bg-[color-mix(in_srgb,var(--color-text-primary)_55%,transparent)] backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border border-[var(--color-border)]',
          'bg-[var(--color-surface)] px-8 py-10 text-center shadow-xl'
        )}
      >
        <Loader2
          className="mx-auto h-10 w-10 animate-spin text-[var(--color-primary)] motion-reduce:animate-none"
          aria-hidden
        />
        <p className="mt-5 font-display text-xl font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        {subtext ? (
          <p className="mt-2 text-sm text-[var(--color-muted)] motion-safe:transition-opacity">
            {subtext}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-[var(--color-muted)]">
          Keep this tab open — AI is working on your preparation.
        </p>
      </div>
    </div>
  );
}
