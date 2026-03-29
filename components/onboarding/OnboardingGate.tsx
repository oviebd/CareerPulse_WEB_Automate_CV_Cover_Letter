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

  // Full-screen overlay would sit above these routes and block clicks (e.g. Upload on /cv/upload).
  if (pathname.startsWith('/cv')) return <>{children}</>;

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
            Welcome
          </h2>
          <div className="mt-4 space-y-4 text-sm text-[var(--color-muted)]">
            {step === 0 && (
              <>
                <p className="text-[var(--color-secondary)]">
                  What are you looking to do first?
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Polish your CV profile</li>
                  <li>Generate tailored cover letters</li>
                  <li>Track applications on a board</li>
                </ul>
                <Button variant="primary" onClick={() => setStep(1)}>
                  Continue
                </Button>
              </>
            )}
            {step === 1 && (
              <>
                <p>
                  Upload your CV for AI extraction, or open the editor to add details
                  manually.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="primary"
                    onClick={() => router.push('/cv/upload')}
                  >
                    Upload CV
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/cv/edit')}
                  >
                    Start from scratch
                  </Button>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  onClick={() => setStep(2)}
                >
                  Skip — I&apos;ll do this later
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <p>Choose a default CV template (change anytime).</p>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/cv/templates')}
                >
                  Open template gallery
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setStep(3)}>
                    Next
                  </Button>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <p>
                  You&apos;re set. Your profile powers cover letters and PDF exports.
                </p>
                <Button
                  variant="primary"
                  loading={finishing}
                  onClick={() => void finish()}
                >
                  Go to dashboard
                </Button>
                <p className="text-xs">
                  <Link href="/pricing" className="text-[var(--color-primary)]">
                    View pricing
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
