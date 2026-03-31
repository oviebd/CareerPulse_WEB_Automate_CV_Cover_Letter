'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useSaveJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useCoreCVVersions } from '@/hooks/useCV';
import type { CVData } from '@/types';
import { formatDate } from '@/lib/utils';

interface OptimiseResult {
  optimised_cv: CVData;
  ai_changes_summary: string;
  keywords_added: string[];
  bullets_improved: number;
  resolved_job_title?: string;
  resolved_company_name?: string | null;
  warnings?: string[];
}

export default function CVOptimisePage() {
  const router = useRouter();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const saveJobCV = useSaveJobSpecificCV();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [baseCoreCvId, setBaseCoreCvId] = useState<string | null>(null);

  const isFree = tier === 'free';
  const jdLength = jobDescription.trim().length;
  const canSubmit =
    jdLength >= 100 &&
    !!jobTitle.trim() &&
    !!companyName.trim() &&
    !isFree &&
    !!baseCoreCvId &&
    !isGenerating;

  useEffect(() => {
    if (!coreVersionsLoading && baseCoreCvId == null && coreVersions.length > 0) {
      setBaseCoreCvId(coreVersions[0].id);
    }
  }, [coreVersionsLoading, coreVersions, baseCoreCvId]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setIsFinalizing(false);
    try {
      const res = await fetch('/api/cv/optimise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          company_name: companyName.trim() || null,
          job_description: jobDescription.trim(),
          core_cv_id: baseCoreCvId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || 'Generation failed', 'error');
        return;
      }
      const data = (await res.json()) as OptimiseResult;
      if (data.warnings?.length) {
        data.warnings.forEach((w) => toast(w, 'info'));
      }

      const resolvedJobTitle = jobTitle.trim();
      const resolvedCompanyName = companyName.trim();

      setIsFinalizing(true);
      const { id } = await saveJobCV.mutateAsync({
        job_title: resolvedJobTitle,
        company_name: resolvedCompanyName,
        job_description: jobDescription.trim(),
        cv_data: data.optimised_cv as unknown as Record<string, unknown>,
        ai_changes_summary: data.ai_changes_summary,
        keywords_added: data.keywords_added,
        bullets_improved: data.bullets_improved,
      });

      toast('Tailored CV ready. Opening editor...', 'success');
      router.push(`/cv/job-specific/${id}/edit`);
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsFinalizing(false);
      setIsGenerating(false);
    }
  }, [baseCoreCvId, companyName, jobDescription, jobTitle, router, saveJobCV, toast]);

  return (
    <div className="mx-auto max-w-5xl">
      {(isGenerating || isFinalizing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="relative flex w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950 px-6 py-14 text-center text-white shadow-2xl">
            <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px] animate-pulse" />

            <div className="relative z-10 mb-5 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-cyan-300 animate-ping" />
              <span className="h-3 w-3 rounded-full bg-fuchsia-300 animate-ping [animation-delay:220ms]" />
              <span className="h-3 w-3 rounded-full bg-emerald-300 animate-ping [animation-delay:420ms]" />
            </div>
            <div className="relative z-10 mb-4 h-14 w-14 rounded-full border-2 border-cyan-300/70 border-t-transparent animate-spin" />
            <p className="relative z-10 font-display text-2xl font-semibold tracking-wide">
              {isFinalizing ? 'Finalizing Tailored CV...' : 'Tailoring CV Intelligence Engine'}
            </p>
            <p className="relative z-10 mt-2 text-sm text-slate-200">
              {isFinalizing
                ? 'Saving your tailored CV and opening the Edit CV page...'
                : 'Analyzing role fit, boosting ATS signals, and rewriting for impact.'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Optimise CV for a job</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Paste the job description below. AI will tailor your CV using only your real experience.
          </p>
        </div>

        {isFree ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="font-semibold text-amber-900">This feature requires a Pro plan or above</p>
            <Link
              href="/settings/billing"
              className="mt-3 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[var(--color-primary-hover)]"
            >
              Upgrade to Pro &rarr;
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6">
            <div className="space-y-4">
              <Select
                label={coreVersionsLoading ? 'Loading…' : 'Base core CV'}
                value={baseCoreCvId ?? ''}
                disabled={coreVersionsLoading || coreVersions.length === 0}
                options={coreVersions.map((v) => ({
                  value: v.id,
                  label: `${v.full_name ?? 'Core CV'} · ${formatDate(v.created_at)}`,
                }))}
                onChange={(e) => setBaseCoreCvId(e.target.value)}
              />
              <Input
                label="Job Title"
                placeholder="e.g. Senior Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
              <Input
                label="Company Name"
                placeholder="e.g. Figma"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <div>
                <Textarea
                  label="Job Description"
                  placeholder="Paste the full job description here. The more complete, the better the match..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[320px]"
                />
                <p
                  className={`mt-1 text-xs ${
                    jdLength > 0 && jdLength < 100 ? 'text-red-500' : 'text-[var(--color-muted)]'
                  }`}
                >
                  {jdLength} / 100 characters minimum
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canSubmit}
                onClick={() => void handleGenerate()}
              >
                Tailor My CV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
