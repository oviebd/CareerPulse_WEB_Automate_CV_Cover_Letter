'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useCoreCVVersions } from '@/hooks/useCV';
import { Step1CVSelector } from '@/components/cv/optimise/Step1CVSelector';
import { Step2JobDetails } from '@/components/cv/optimise/Step2JobDetails';
import { Step3GenerateType } from '@/components/cv/optimise/Step3GenerateType';
import { InsightPanel } from '@/components/cv/optimise/InsightPanel';
import { StepperHeader, type StepId } from '@/components/cv/optimise/StepperHeader';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import { useOptimiseEditDraftStore } from '@/stores/useOptimiseEditDraftStore';
import type { DraftResult, GenerationType, JobAnalysisResult } from '@/types';
import { cn } from '@/lib/utils';

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';

export default function CVOptimisePage() {
  const router = useRouter();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const setOptimiseDraft = useOptimiseDraftStore((s) => s.setDraft);
  const setCvEditDraft = useOptimiseEditDraftStore((s) => s.setCvEditDraft);
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generateType, setGenerateType] = useState<GenerationType>('cv');
  const [isGenerating, setIsGenerating] = useState(false);

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysisResult, setAnalysisResult] = useState<JobAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const postGenerateNavRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFree = tier === 'free';
  const jdLength = jobDescription.trim().length;
  const canContinueStep1 = Boolean(selectedCV);
  const canContinueStep2 = jdLength >= 100;
  const canAnalyse = jdLength >= 50 && Boolean(selectedCV) && !isGenerating && analysisState !== 'loading';
  const canGenerate = jdLength >= 100 && Boolean(selectedCV) && !isGenerating;
  const insightVisible = analysisState !== 'idle';

  useEffect(() => {
    if (!coreVersionsLoading && selectedCV == null && coreVersions.length > 0) {
      setSelectedCV(coreVersions[0].id);
    }
  }, [coreVersionsLoading, coreVersions, selectedCV]);

  useEffect(
    () => () => {
      if (postGenerateNavRef.current) {
        clearTimeout(postGenerateNavRef.current);
        postGenerateNavRef.current = null;
      }
    },
    []
  );

  const maxAccessibleStep = useMemo<StepId>(() => {
    if (!canContinueStep1) return 1;
    if (!canContinueStep2) return 2;
    return 3;
  }, [canContinueStep1, canContinueStep2]);

  const goToStep = useCallback(
    (target: StepId) => {
      if (target <= maxAccessibleStep) {
        setCurrentStep(target);
      }
    },
    [maxAccessibleStep]
  );

  const goNextFromCurrent = useCallback(() => {
    if (currentStep === 1 && canContinueStep1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2 && canContinueStep2) {
      setCurrentStep(3);
    }
  }, [canContinueStep1, canContinueStep2, currentStep]);

  const handleAnalyse = useCallback(async () => {
    if (!selectedCV) return;
    setAnalysisState('loading');
    setAnalysisError(null);

    try {
      const res = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim() || undefined,
          cvId: selectedCV,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Analysis failed');
      }
      const data = (await res.json()) as JobAnalysisResult;
      setAnalysisResult(data);
      setAnalysisState('done');
    } catch (e) {
      setAnalysisState('error');
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed');
    }
  }, [jobDescription, jobUrl, selectedCV]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCV) return;
    setIsGenerating(true);
    if (postGenerateNavRef.current) {
      clearTimeout(postGenerateNavRef.current);
      postGenerateNavRef.current = null;
    }

    try {
      const res = await fetch('/api/cv/optimise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle.trim() || undefined,
          company_name: companyName.trim() || undefined,
          job_description: jobDescription.trim(),
          core_cv_id: selectedCV,
          generationType: generateType,
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
        coverLetter?: string;
        generationType?: GenerationType;
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
        coverLetter: data.coverLetter,
        generationType: data.generationType ?? generateType,
        jobDescription: jobDescription.trim(),
        jobUrl: jobUrl.trim() || null,
        analysis: analysisResult,
        originalCvId: selectedCV,
        savedJobId: null,
        savedCvId: null,
        savedCoverLetterId: null,
        isTracked: false,
        extractedKeywords: data.extractedKeywords ?? analysisResult?.keywords ?? [],
        jobTitle: data.jobTitle ?? analysisResult?.jobTitle ?? null,
        companyName: data.companyName ?? analysisResult?.company ?? null,
        aiChangesSummary: data.ai_changes_summary,
        bulletsImproved: data.bullets_improved,
        warnings: data.warnings,
      };

      setOptimiseDraft(draft);
      setCvEditDraft({
        cvContent: draft.cv ?? '',
        coverLetter: draft.coverLetter,
        generationType: draft.generationType,
        originalCvId: draft.originalCvId,
        jobTitle: draft.jobTitle ?? draft.analysis?.jobTitle ?? null,
        companyName: draft.companyName ?? draft.analysis?.company ?? null,
        jobDescription: draft.jobDescription,
        jobUrl: draft.jobUrl,
        analysis: draft.analysis,
        savedJobId: null,
        savedCvId: null,
        savedCoverLetterId: null,
        extractedKeywords: draft.extractedKeywords ?? [],
        aiChangesSummary: draft.aiChangesSummary ?? null,
        bulletsImproved: draft.bulletsImproved ?? 0,
        isTracked: false,
        coverLetterTone: draft.coverLetterTone,
        coverLetterLength: draft.coverLetterLength,
        coverLetterEmphasis: draft.coverLetterEmphasis ?? null,
      });

      postGenerateNavRef.current = setTimeout(() => {
        postGenerateNavRef.current = null;
        router.push('/cv/job-specific/draft/edit');
      }, 400);
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    analysisResult,
    companyName,
    generateType,
    jobDescription,
    jobTitle,
    jobUrl,
    router,
    selectedCV,
    setCvEditDraft,
    setOptimiseDraft,
    toast,
  ]);

  const actionLabel =
    generateType === 'cv'
      ? 'Optimise my CV'
      : generateType === 'coverLetter'
        ? 'Generate cover letter'
        : 'Optimise CV + cover letter';

  return (
    <div className="mx-auto max-w-[1320px] px-1 py-2">
      {isGenerating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950 px-8 py-12 text-center text-white shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
            <p className="mt-5 font-display text-2xl font-semibold">Optimizing your content</p>
            <p className="mt-2 text-sm text-slate-300">Applying ATS and role-fit improvements...</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">CV Optimise</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-muted)]">
            Follow three steps to tailor your application: choose source CV, add role context, then generate.
          </p>
        </header>

        {isFree ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-8 text-center">
            <p className="font-semibold text-amber-900">This feature requires a Pro plan or above.</p>
            <Link
              href="/settings/billing"
              className="mt-3 inline-flex rounded-btn bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Upgrade to Pro
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              'grid items-start gap-8 transition-all duration-300',
              insightVisible ? 'xl:grid-cols-[minmax(0,1fr)_380px]' : 'xl:grid-cols-1'
            )}
          >
            <main className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
              <StepperHeader currentStep={currentStep} maxAccessibleStep={maxAccessibleStep} onStepClick={goToStep} />

              <div className="rounded-2xl border border-[var(--color-border)]/70 bg-[var(--color-input-bg)]/20 p-6 sm:p-8">
                {currentStep === 1 ? (
                  <Step1CVSelector
                    options={coreVersions}
                    loading={coreVersionsLoading}
                    selectedCvId={selectedCV}
                    onSelect={setSelectedCV}
                  />
                ) : null}

                {currentStep === 2 ? (
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
                ) : null}

                {currentStep === 3 ? <Step3GenerateType value={generateType} onChange={setGenerateType} /> : null}

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)]/70 pt-6">
                  <div>
                    {currentStep > 1 ? (
                      <Button variant="secondary" onClick={() => setCurrentStep((prev) => (prev === 3 ? 2 : 1))}>
                        Back
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    {currentStep < 3 ? (
                      <Button
                        onClick={goNextFromCurrent}
                        disabled={(currentStep === 1 && !canContinueStep1) || (currentStep === 2 && !canContinueStep2)}
                      >
                        Continue
                      </Button>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="primary"
                          size="lg"
                          className="min-h-12 w-full shadow-md sm:w-auto"
                          disabled={!canGenerate}
                          loading={isGenerating}
                          onClick={() => void handleGenerate()}
                        >
                          {actionLabel}
                        </Button>
                        <button
                          type="button"
                          onClick={() => void handleAnalyse()}
                          disabled={!canAnalyse}
                          className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-4 disabled:cursor-not-allowed disabled:text-[var(--color-muted)]"
                        >
                          {analysisState === 'loading' ? 'Analysing...' : 'Analyse first'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </main>

            <div
              className={cn(
                'transition-all duration-300',
                insightVisible ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-8 opacity-0'
              )}
            >
              {insightVisible ? (
                <InsightPanel
                  state={analysisState === 'idle' ? 'loading' : analysisState}
                  analysis={analysisResult}
                  errorMessage={analysisError}
                  onRetry={() => void handleAnalyse()}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
