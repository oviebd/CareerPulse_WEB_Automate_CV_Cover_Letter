'use client';

import { useEffect, useMemo, useState } from 'react';

function formatRemaining(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  startedAt: string;
  durationMinutes: number;
  onTimeUp: () => void;
};

export function SessionTimer({ startedAt, durationMinutes, onTimeUp }: Props) {
  const budgetSeconds = durationMinutes * 60;
  const [now, setNow] = useState(() => Date.now());
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedSeconds = useMemo(() => {
    const start = new Date(startedAt).getTime();
    return Math.max(0, Math.floor((now - start) / 1000));
  }, [now, startedAt]);

  const remainingSeconds = Math.max(0, budgetSeconds - elapsedSeconds);

  useEffect(() => {
    if (remainingSeconds <= 0 && !fired) {
      setFired(true);
      onTimeUp();
    }
  }, [remainingSeconds, fired, onTimeUp]);

  const pct = budgetSeconds > 0 ? (remainingSeconds / budgetSeconds) * 100 : 0;

  return (
    <p className="text-sm text-[var(--color-text-secondary)]">
      Time remaining:{' '}
      <span
        className={
          remainingSeconds <= 180
            ? 'font-semibold text-[var(--color-accent-coral)]'
            : 'font-semibold text-[var(--color-text-primary)]'
        }
      >
        {formatRemaining(remainingSeconds)}
      </span>{' '}
      <span className="text-[var(--color-muted)]">({Math.round(pct)}% of session)</span>
    </p>
  );
}
