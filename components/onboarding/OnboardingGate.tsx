'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const qc = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  if (!profile || profile.is_onboarded) return <>{children}</>;

  if (pathname.startsWith('/cv') || pathname.startsWith('/applications')) {
    return <>{children}</>;
  }

  async function finish() {
    if (!profile) return;
    setFinishing(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_onboarded: true })
      .eq('id', profile.id)
      .select()
      .single();
    setFinishing(false);
    if (!error && data) {
      setProfile({ ...profile, is_onboarded: true });
      void qc.invalidateQueries({ queryKey: ['cv-profile'] });
    }
  }

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
          <h2 className="font-display text-lg font-semibold text-[var(--color-secondary)]">
            Welcome to CareerPulse
          </h2>
          <div className="mt-4 space-y-4 text-sm text-[var(--color-muted)]">
            {step === 0 && (
              <>
                <p className="text-[var(--color-text-primary)]">
                  Paste a job posting to get a tailored CV and cover letter — or build your base CV first.
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="primary" onClick={() => router.push('/applications/new')}>
                    Paste a job posting
                  </Button>
                  <Button variant="secondary" onClick={() => setStep(1)}>
                    I don&apos;t have a job yet
                  </Button>
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <p>Do you already have a CV?</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="primary" onClick={() => router.push('/cv/upload')}>
                    Yes — upload CV
                  </Button>
                  <Button variant="secondary" onClick={() => router.push('/cv/edit')}>
                    No — guided builder
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  onClick={() => void finish()}
                >
                  Skip for now
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <p>You&apos;re all set. Add your first job when you&apos;re ready.</p>
                <Button variant="primary" loading={finishing} onClick={() => void finish()}>
                  Go to Home
                </Button>
                <Link
                  href="/applications/new"
                  className="block text-center text-xs font-medium text-[var(--color-primary)]"
                  onClick={() => void finish()}
                >
                  Add a job now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
