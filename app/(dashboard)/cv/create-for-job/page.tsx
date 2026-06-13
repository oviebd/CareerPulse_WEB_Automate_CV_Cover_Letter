'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Target, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Step1CVSelector } from '@/components/cv/optimise/Step1CVSelector';
import { Step2JobDetails } from '@/components/cv/optimise/Step2JobDetails';
import { useCoreCVVersions } from '@/hooks/useCV';
import { useJobApplications } from '@/hooks/useTracker';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import { useOptimiseEditDraftStore } from '@/stores/useOptimiseEditDraftStore';
import type { DraftResult, GenerationType } from '@/types';

type SourceMode = 'tracked-job' | 'paste-jd';

export default function CreateCVForJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setOptimiseDraft = useOptimiseDraftStore((s) => s.setDraft);
  const setCvEditDraft = useOptimiseEditDraftStore((s) => s.setCvEditDraft);
  const { data: coreVersions = [], isLoading: cvsLoading } = useCoreCVVersions();
  const { data: jobs = [] } = useJobApplications();

  const [sourceMode, setSourceMode] = useState<SourceMode>('tracked-job');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedCvId, setSelectedCvId] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!cvsLoading && selectedCvId == null && coreVersions.length > 0) {
      setSelectedCvId(coreVersions[0].id);
    }
  }, [cvsLoading, coreVersions, selectedCvId]);

  // When a tracked job is selected, pre-fill title and company
  useEffect(() => {
    if (sourceMode !== 'tracked-job' || !selectedJobId) return;
    const job = jobs.find((j) => j.id === selectedJobId);
    if (job) {
      setJobTitle(job.job_title);
      setCompanyName(job.company_name);
      setJobUrl(job.job_url ?? '');
    }
  }, [selectedJobId, jobs, sourceMode]);

  const trackedJobs = jobs.filter((j) => j.status !== 'archived');
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const canGenerate =
    selectedCvId != null &&
    (sourceMode === 'paste-jd' ? jobDescription.trim().length >= 100 : Boolean(selectedJobId));

  const handleGenerate = useCallback(async () => {
    if (!selectedCvId || !canGenerate) return;
    setIsGenerating(true);

    const effectiveJD =
      sourceMode === 'paste-jd'
        ? jobDescription.trim()
        : selectedJob?.job_summary ?? '';

    try {
      const res = await fetch('/api/cv/optimise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle.trim() || undefined,
          company_name: companyName.trim() || undefined,
          job_description: effectiveJD || undefined,
          core_cv_id: selectedCvId,
          generationType: 'cv' as GenerationType,
          savedJobId: sourceMode === 'tracked-job' ? selectedJobId : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(typeof err.error === 'string' ? err.error : 'Generation failed', 'error');
        return;
      }

      const data = (await res.json()) as {
        cv?: string;
        cvContent?: string;
        extractedKeywords?: string[];
        jobTitle?: string | null;
        companyName?: string | null;
        ai_changes_summary?: string;
        bullets_improved?: number;
        warnings?: string[];
      };

      if (data.warnings?.length) {
        data.warnings.forEach((w) => toast(w, 'info'));
      }

      const draft: DraftResult = {
        cv: data.cv ?? data.cvContent,
        coverLetter: undefined,
        generationType: 'cv',
        jobDescription: effectiveJD,
        jobUrl: jobUrl.trim() || null,
        analysis: null,
        originalCvId: selectedCvId,
        savedJobId: sourceMode === 'tracked-job' ? selectedJobId : null,
        savedCvId: null,
        savedCoverLetterId: null,
        isTracked: sourceMode === 'tracked-job',
        extractedKeywords: data.extractedKeywords ?? [],
        jobTitle: (data.jobTitle ?? jobTitle) || null,
        companyName: (data.companyName ?? companyName) || null,
        aiChangesSummary: data.ai_changes_summary,
        bulletsImproved: data.bullets_improved,
        warnings: data.warnings,
      };

      setOptimiseDraft(draft);
      setCvEditDraft({
        cvContent: draft.cv ?? '',
        coverLetter: undefined,
        generationType: 'cv',
        originalCvId: draft.originalCvId,
        jobTitle: draft.jobTitle,
        companyName: draft.companyName,
        jobDescription: draft.jobDescription,
        jobUrl: draft.jobUrl,
        analysis: null,
        savedJobId: draft.savedJobId,
        savedCvId: null,
        savedCoverLetterId: null,
        extractedKeywords: draft.extractedKeywords ?? [],
        aiChangesSummary: draft.aiChangesSummary ?? null,
        bulletsImproved: draft.bulletsImproved ?? 0,
        isTracked: draft.isTracked,
        coverLetterTone: undefined,
        coverLetterLength: undefined,
        coverLetterEmphasis: null,
      });

      router.push('/cv/optimise/result');
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    canGenerate,
    companyName,
    jobDescription,
    jobTitle,
    jobUrl,
    router,
    selectedCvId,
    selectedJob,
    selectedJobId,
    setCvEditDraft,
    setOptimiseDraft,
    sourceMode,
    toast,
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-2">
      {isGenerating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950 px-8 py-12 text-center text-white shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
            <p className="mt-5 font-display text-2xl font-semibold">Optimising your CV</p>
            <p className="mt-2 text-sm text-slate-300">Applying ATS and role-fit improvements…</p>
          </div>
        </div>
      ) : null}

      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Create CV For Job
        </h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Generate an AI-optimised CV tailored to a specific role.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-8">

        {/* Step 1: Source selection */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Step 1</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">Job source</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSourceMode('tracked-job')}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                sourceMode === 'tracked-job'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)/20]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Select tracked job</p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">Pick from your Job Tracker</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('paste-jd')}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                sourceMode === 'paste-jd'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)/20]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Paste job description</p>
                <p className="mt-0.5 text-xs text-[var(--color-muted)]">No tracking required</p>
              </div>
            </button>
          </div>

          {/* Job selector or JD textarea */}
          {sourceMode === 'tracked-job' ? (
            <div className="space-y-3">
              {trackedJobs.length === 0 ? (
                <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-faint)] px-4 py-3 text-sm text-[var(--color-muted)]">
                  No tracked jobs found.{' '}
                  <a href="/dashboard" className="text-[var(--color-primary)] underline">
                    Add a job first
                  </a>{' '}
                  or switch to &ldquo;Paste job description&rdquo;.
                </p>
              ) : (
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-500)]"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="">Select a job…</option>
                  {trackedJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company_name} — {job.job_title}
                    </option>
                  ))}
                </select>
              )}
              {selectedJob ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-faint)] px-3 py-2 text-xs text-[var(--color-muted)]">
                  <Target className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  <span>
                    Optimising for <strong>{selectedJob.company_name}</strong> — {selectedJob.job_title}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <Step2JobDetails
              jobTitle={jobTitle}
              companyName={companyName}
              jobDescription={jobDescription}
              jobUrl={jobUrl}
              onJobTitleChange={setJobTitle}
              onCompanyNameChange={setCompanyName}
              onJobDescriptionChange={setJobDescription}
              onJobUrlChange={setJobUrl}
            />
          )}
        </section>

        <hr className="border-[var(--color-border)]" />

        {/* Step 2: Base CV */}
        <section>
          <Step1CVSelector
            options={coreVersions}
            loading={cvsLoading}
            selectedCvId={selectedCvId}
            onSelect={setSelectedCvId}
          />
        </section>

        {/* Generate */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[var(--color-muted)] hover:underline"
          >
            ← Back
          </button>
          <Button
            variant="primary"
            size="lg"
            disabled={!canGenerate}
            loading={isGenerating}
            onClick={() => void handleGenerate()}
          >
            Generate Optimised CV
          </Button>
        </div>
      </div>
    </div>
  );
}
