'use client';

import { useEffect, useMemo, useState } from 'react';

function formatRemaining(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  durationMinutes: number;
  elapsedSeconds: number;
  timerStartedAt: string | null;
  status: string;
  onTimeUp: () => void;
};

export function SessionTimer({
  durationMinutes,
  elapsedSeconds,
  timerStartedAt,
  status,
  onTimeUp,
}: Props) {
  const budgetSeconds = durationMinutes * 60;
  const [now, setNow] = useState(() => Date.now());
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (status === 'paused') return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const totalElapsed = useMemo(() => {
    if (status === 'paused') return elapsedSeconds;
    const timerStart = timerStartedAt;
    if (!timerStart) return elapsedSeconds;
    const live = Math.max(0, Math.floor((now - new Date(timerStart).getTime()) / 1000));
    return elapsedSeconds + live;
  }, [elapsedSeconds, timerStartedAt, status, now]);

  const remainingSeconds = Math.max(0, budgetSeconds - totalElapsed);

  useEffect(() => {
    if (status === 'paused') return;
    if (remainingSeconds <= 0 && !fired) {
      setFired(true);
      onTimeUp();
    }
  }, [remainingSeconds, fired, onTimeUp, status]);

  const pct = budgetSeconds > 0 ? (remainingSeconds / budgetSeconds) * 100 : 0;

  return (
    <p className="text-sm text-[var(--color-text-secondary)]">
      {status === 'paused' ? (
        <span className="font-semibold text-[var(--color-muted)]">Paused</span>
      ) : (
        <>
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
        </>
      )}
    </p>
  );
}
