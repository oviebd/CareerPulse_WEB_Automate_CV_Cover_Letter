'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, FileText, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { createClient } from '@/lib/supabase/client';

export default function NewCoverLetterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const [scratchBusy, setScratchBusy] = useState(false);

  async function handleFromScratch() {
    if (!userId) return;
    setScratchBusy(true);
    try {
      // Auto-populate applicant fields from the user's primary (non-job-specific) CV.
      const supabase = createClient();
      const { data: cvRows } = await supabase
        .from('cvs')
        .select('full_name, professional_title, email, phone, location')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const primaryCv =
        (cvRows ?? []).find(
          (r: { full_name: string | null; professional_title: string | null; email: string | null; phone: string | null; location: string | null; job_ids?: unknown }) =>
            !Array.isArray(r.job_ids) || (r.job_ids as string[]).length === 0
        ) ?? cvRows?.[0];

      const res = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          template_id: 'cl-classic',
          source_type: 'scratch',
          applicant_name: primaryCv?.full_name ?? null,
          applicant_role: primaryCv?.professional_title ?? null,
          applicant_email: primaryCv?.email ?? null,
          applicant_phone: primaryCv?.phone ?? null,
          applicant_location: primaryCv?.location ?? null,
        }),
      });
      if (!res.ok) {
        toast('Could not create cover letter. Please try again.', 'error');
        return;
      }
      const created = (await res.json()) as { id: string };
      router.push(`/cover-letters/${created.id}`);
    } catch {
      toast('Could not create cover letter. Please try again.', 'error');
    } finally {
      setScratchBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/cover-letters" className="text-sm text-[var(--color-primary)]">
        ← Back
      </Link>
      <div>
        <h1 className="font-display text-2xl font-bold">Create Cover Letter</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Choose how you&apos;d like to start.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* From Job Description */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-2)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
            <Briefcase className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              From Job Description
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Paste a job description and AI will generate a tailored cover letter using your CV.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/cv/optimise')}
          >
            Get started
          </Button>
        </div>

        {/* Enhance Existing */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-2)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent-gold)]/10">
            <FileText className="h-5 w-5 text-[var(--color-accent-gold)]" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Enhance Existing Letter
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Paste an existing cover letter and AI will rewrite it to improve clarity, tone, and impact.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/cover-letters/new/existing')}
          >
            Get started
          </Button>
        </div>

        {/* From Scratch */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-2)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <PenLine className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              From Scratch
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Start with a blank canvas. Write your own content, pick a template, and export when ready.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={scratchBusy}
            onClick={() => void handleFromScratch()}
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
}
