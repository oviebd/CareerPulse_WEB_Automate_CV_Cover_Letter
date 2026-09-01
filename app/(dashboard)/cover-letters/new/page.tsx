'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, FileText, PenLine, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api-fetch';

export default function NewCoverLetterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [scratchBusy, setScratchBusy] = useState(false);

  async function handleFromScratch() {
    if (!userId) return;
    setScratchBusy(true);
    try {
      const primaryCv = await apiFetch<{
        full_name: string | null;
        professional_title: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
      } | null>('/api/cvs/profile');

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
      void qc.invalidateQueries({ queryKey: ['cover-letters'] });
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

      <div className="grid gap-4 sm:grid-cols-2">
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
              Paste a job description and AI will generate a tailored cover letter for that role.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/cover-letters/new/jd')}
          >
            Get started
          </Button>
        </div>

        {/* Upload */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-2)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
            <Upload className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-[var(--color-text-primary)]">
              Upload Cover Letter
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Import a PDF or DOCX cover letter, then edit it with your preferred template.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/cover-letters/new/upload')}
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
              Paste or upload an existing cover letter and AI will rewrite it to improve clarity, tone, and impact.
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
