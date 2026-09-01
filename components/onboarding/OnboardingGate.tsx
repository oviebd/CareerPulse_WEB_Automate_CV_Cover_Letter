'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api-fetch';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { CVProfile } from '@/types';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userId = useAuthStore((s) => s.user?.id);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const qc = useQueryClient();
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const finishStarted = useRef(false);

  const needsOnboarding = !!profile && !profile.is_onboarded;

  const cvsQuery = useQuery({
    queryKey: ['all-cvs', userId],
    enabled: !!userId && needsOnboarding,
    queryFn: async (): Promise<CVProfile[]> => {
      const res = await fetch('/api/cvs');
      if (!res.ok) throw new Error('Failed to load CVs');
      return res.json() as Promise<CVProfile[]>;
    },
    staleTime: 30_000,
  });

  const hasCv = (cvsQuery.data?.length ?? 0) > 0;

  const finish = useCallback(async () => {
    if (!profile || finishStarted.current) return;
    finishStarted.current = true;
    setFinishing(true);
    try {
      const data = await apiFetch<typeof profile>('/api/account/onboarding', {
        method: 'PATCH',
      });
      setProfile({ ...profile, ...data, is_onboarded: true });
      void qc.invalidateQueries({ queryKey: ['cv-profile'] });
    } catch {
      finishStarted.current = false;
    } finally {
      setFinishing(false);
    }
  }, [profile, qc, setProfile]);

  useEffect(() => {
    if (!needsOnboarding || !hasCv) return;
    void finish();
  }, [needsOnboarding, hasCv, finish]);

  const skipPath =
    pathname.startsWith('/cv') || pathname.startsWith('/applications');

  function handleDismiss() {
    setDismissed(true);
    void finish();
  }

  const hideGate =
    !profile ||
    !userId ||
    profile.is_onboarded ||
    dismissed ||
    skipPath ||
    cvsQuery.isLoading ||
    hasCv;

  if (hideGate) return <>{children}</>;

  return (
    <>
      {children}
      <Modal isOpen onClose={handleDismiss} title="Welcome to CareerPulse">
        <div className="space-y-4 text-sm text-[var(--color-muted)]">
          <p className="text-[var(--color-text-primary)]">
            Paste a job posting to get a tailored CV and cover letter — or build your base CV first.
          </p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => router.push('/cv/upload')}>
              Upload or create my CV first
            </Button>
            <Button variant="primary" onClick={() => router.push('/applications/new')}>
              I already have a CV — paste a job posting
            </Button>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
            disabled={finishing}
            onClick={handleDismiss}
          >
            Skip for now
          </button>
        </div>
      </Modal>
    </>
  );
}
