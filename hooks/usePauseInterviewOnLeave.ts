'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Pause an active mock interview on real leave, not React Strict Mode remounts. */
export function usePauseInterviewOnLeave(
  sessionId: string,
  status: string | undefined,
  skipPause: React.MutableRefObject<boolean>
) {
  const pausedOnLeave = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const clearLeavePause = useCallback(() => {
    pausedOnLeave.current = false;
  }, []);

  useEffect(() => {
    pausedOnLeave.current = false;
    let committed = false;
    const commitId = window.setTimeout(() => {
      committed = true;
    }, 0);

    const pauseOnLeave = () => {
      if (pausedOnLeave.current || skipPause.current) return;
      if (statusRef.current !== 'active') return;
      pausedOnLeave.current = true;
      void fetch(`/api/interview/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
        keepalive: true,
      });
    };

    window.addEventListener('pagehide', pauseOnLeave);
    window.addEventListener('beforeunload', pauseOnLeave);
    return () => {
      window.clearTimeout(commitId);
      window.removeEventListener('pagehide', pauseOnLeave);
      window.removeEventListener('beforeunload', pauseOnLeave);
      if (committed) pauseOnLeave();
    };
  }, [sessionId, skipPause]);

  return { clearLeavePause };
}
