/*
 * OPTIMISE FLOW (internal analysis summary)
 * - Next.js 14 app router; dashboard routes under app/(dashboard)/cv/optimise.
 * - Generation: POST /api/cv/optimise uses CLAUDE_MODEL (ANTHROPIC_MODEL); optional POST /api/jobs/analyze uses CV_ANALYZER_API_MODEL (Haiku).
 * - Results: useOptimiseDraftStore + useOptimiseEditDraftStore (Zustand). With JD → /cv/job-specific/draft/edit; without JD → /cv/optimise/result.
 * - DB: jobs (job_title, company_name, job_url, keywords JSONB, job_summary, status); cvs/cover_letters via save-optimised (job_ids[]).
 * - Cover letter standalone page uses the same optimise API with generationType coverLetter (GenerateCoverLetterForm).
 */

'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  AlertTriangle,
  Building2,
  MapPin,
  FileText,
  Sparkles,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useCoreCVVersions } from '@/hooks/useCV';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import { useOptimiseEditDraftStore } from '@/stores/useOptimiseEditDraftStore';
import type { DraftResult, GenerationType, JobAnalysisResult } from '@/types';
import { cn, formatDate } from '@/lib/utils';

type AnalysisState = 'idle' | 'loading' | 'done' | 'error';

const GEN_OPTIONS: { value: GenerationType; label: string }[] = [
  { value: 'cv', label: 'CV Only' },
  { value: 'coverLetter', label: 'Cover Letter Only' },
  { value: 'both', label: 'CV + Cover Letter' },
];

function isProbablyValidUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--color-border)]/70 bg-[var(--color-input-bg)]/35 p-4 sm:p-5">
      <header className="space-y-1">
        <h3 className="text-sm font-semibold leading-tight text-[var(--color-text-primary)]">{title}</h3>
        {description ? <p className="text-xs leading-relaxed text-[var(--color-muted)]">{description}</p> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function CVOptimisePage() {
  const router = useRouter();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const setOptimiseDraft = useOptimiseDraftStore((s) => s.setDraft);
  const setCvEditDraft = useOptimiseEditDraftStore((s) => s.setCvEditDraft);
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();

  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobUrlWarning, setJobUrlWarning] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [baseCoreCvId, setBaseCoreCvId] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<GenerationType>('cv');

  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<JobAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [generatePreview, setGeneratePreview] = useState<string | null>(null);
  const postGenerateNavRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFree = tier === 'free';
  const jdLength = jobDescription.trim().length;
  const canSubmit = jdLength >= 100 && !isFree && !!baseCoreCvId && !isGenerating;
  const canAnalyse =
    jdLength >= 50 && !isFree && !!baseCoreCvId && analysisState !== 'loading' && !isGenerating;

  useEffect(() => {
    if (!coreVersionsLoading && baseCoreCvId == null && coreVersions.length > 0) {
      setBaseCoreCvId(coreVersions[0].id);
    }
  }, [coreVersionsLoading, coreVersions, baseCoreCvId]);

  useEffect(
    () => () => {
      if (postGenerateNavRef.current) {
        clearTimeout(postGenerateNavRef.current);
        postGenerateNavRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    setJobUrlWarning(Boolean(jobUrl.trim()) && !isProbablyValidUrl(jobUrl));
  }, [jobUrl]);

  const handleAnalyse = useCallback(async () => {
    if (!baseCoreCvId) return;
    setAnalysisState('loading');
    setAnalysisError(null);
    setGeneratePreview(null);
    try {
      const res = await fetch('/api/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: jobDescription.trim(),
          jobUrl: jobUrl.trim() || undefined,
          cvId: baseCoreCvId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Analysis failed');
      }
      const data = (await res.json()) as JobAnalysisResult;
      setAnalysis(data);
      setAnalysisState('done');
    } catch (e) {
      setAnalysisState('error');
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed');
    }
  }, [baseCoreCvId, jobDescription, jobUrl]);

  const handleGenerate = useCallback(async () => {
    if (!baseCoreCvId) return;
    setIsGenerating(true);
    setGeneratePreview(null);
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
          core_cv_id: baseCoreCvId,
          generationType,
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

      const previewSource =
        generationType === 'coverLetter'
          ? (data.coverLetter ?? '')
          : generationType === 'both'
            ? [data.cv ?? data.cvContent, data.coverLetter].filter(Boolean).join('\n\n—\n\n')
            : (data.cv ?? data.cvContent ?? '');
      const trimmedPreview = previewSource.trim();
      setGeneratePreview(
        trimmedPreview.length > 0
          ? trimmedPreview.slice(0, 520)
          : 'Your tailored content is ready — opening the editor next.'
      );

      const mergedAnalysis = analysis;
      const draft: DraftResult = {
        cv: data.cv ?? data.cvContent,
        coverLetter: data.coverLetter,
        generationType: data.generationType ?? generationType,
        jobDescription: jobDescription.trim(),
        jobUrl: jobUrl.trim() || null,
        analysis: mergedAnalysis,
        originalCvId: baseCoreCvId,
        savedJobId: null,
        savedCvId: null,
        savedCoverLetterId: null,
        isTracked: false,
        extractedKeywords: data.extractedKeywords ?? mergedAnalysis?.keywords ?? [],
        jobTitle: data.jobTitle ?? mergedAnalysis?.jobTitle ?? null,
        companyName: data.companyName ?? mergedAnalysis?.company ?? null,
        aiChangesSummary: data.ai_changes_summary,
        bulletsImproved: data.bullets_improved,
        warnings: data.warnings,
      };
      setOptimiseDraft(draft);
      const hasJd = jobDescription.trim().length > 0;
      if (hasJd) {
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
      }

      if (postGenerateNavRef.current) clearTimeout(postGenerateNavRef.current);
      postGenerateNavRef.current = setTimeout(() => {
        postGenerateNavRef.current = null;
        if (hasJd) {
          router.push('/cv/job-specific/draft/edit');
        } else {
          router.push('/cv/optimise/result');
        }
      }, 560);
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [
    baseCoreCvId,
    companyName,
    generationType,
    jobDescription,
    jobTitle,
    jobUrl,
    analysis,
    router,
    setOptimiseDraft,
    setCvEditDraft,
    toast,
  ]);

  const genLabel =
    generationType === 'cv'
      ? 'Generate CV'
      : generationType === 'coverLetter'
        ? 'Generate Cover Letter'
        : 'Generate CV + Cover Letter';

  const matchPct = analysis?.matchPercentage ?? 0;
  const charProgress = Math.min(100, (jdLength / 100) * 100);
  const insightShowAnalysis =
    analysisState === 'done' && analysis && !generatePreview && !isGenerating;

  return (
    <div className="mx-auto max-w-[1200px] px-0 sm:px-1">
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
          <div className="relative flex w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950 px-6 py-14 text-center text-white shadow-[0_25px_80px_-20px_rgba(0,0,0,0.55)]">
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
              Tailoring CV Intelligence Engine
            </p>
            <p className="relative z-10 mt-2 text-sm text-slate-200">
              Analyzing role fit, boosting ATS signals, and rewriting for impact.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6 sm:space-y-8">
        <div className="text-center sm:text-left">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Optimise CV for a job</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)] sm:mx-0 sm:text-[15px]">
            A guided flow: add the role details, optionally analyse fit, then generate. AI only uses your real
            experience from the base CV.
          </p>
        </div>

        {isFree ? (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] sm:p-8">
            <p className="font-semibold text-amber-900">This feature requires a Pro plan or above</p>
            <Link
              href="/settings/billing"
              className="mt-3 inline-flex rounded-btn bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
            >
              Upgrade to Pro &rarr;
            </Link>
          </div>
        ) : (
          <>
            <ol className="flex list-none flex-col gap-2 rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4 text-sm shadow-[0_2px_20px_rgba(15,23,42,0.04)] sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-0 sm:divide-x sm:divide-[var(--color-border)]/70 sm:rounded-2xl sm:p-0">
              <li className="flex flex-1 gap-2 rounded-lg px-2 py-2 sm:items-center sm:px-4 sm:py-3.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    jdLength >= 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[var(--color-input-bg)] text-[var(--color-muted)]'
                  )}
                >
                  1
                </span>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Add job description</p>
                  <p className="text-xs text-[var(--color-muted)]">100+ characters to enable generate (50+ to analyse)</p>
                </div>
              </li>
              <li className="flex flex-1 gap-2 rounded-lg px-2 py-2 sm:items-center sm:px-4 sm:py-3.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    analysisState === 'done'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-[var(--color-input-bg)] text-[var(--color-muted)]'
                  )}
                >
                  2
                </span>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Analyse (optional)</p>
                  <p className="text-xs text-[var(--color-muted)]">Match score, strengths, and role keywords</p>
                </div>
              </li>
              <li className="flex flex-1 gap-2 rounded-lg px-2 py-2 sm:items-center sm:px-4 sm:py-3.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    canSubmit ? 'bg-violet-100 text-violet-800' : 'bg-[var(--color-input-bg)] text-[var(--color-muted)]'
                  )}
                >
                  3
                </span>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">Generate</p>
                  <p className="text-xs text-[var(--color-muted)]">Tailor CV or cover letter from your base</p>
                </div>
              </li>
            </ol>

            <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
              <div
                className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-5 sm:p-6"
                style={{ boxShadow: '0 2px 24px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.02)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Input</p>
                <h2 className="mt-1 font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  Job &amp; source material
                </h2>
                <div className="mt-6 space-y-6 sm:mt-7">
                  <FormSection
                    title="Base CV"
                    description="The tailored output starts from this core version — your facts stay the anchor."
                  >
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
                  </FormSection>

                  <FormSection
                    title="Job details"
                    description="Add what you know — the rest can be inferred from the posting."
                  >
                    <Input
                      label="Job title (optional)"
                      placeholder="e.g. Senior Product Manager (we can infer this from the description)"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    <Input
                      label="Company name (optional)"
                      placeholder="e.g. Figma, Stripe, or your target employer"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                    <div>
                      <Input
                        label="Job posting URL (optional)"
                        placeholder="https://www.linkedin.com/jobs/view/…"
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                      {jobUrlWarning ? (
                        <p className="mt-1.5 text-xs text-amber-700">
                          That doesn&apos;t look like a valid http(s) URL — you can still continue.
                        </p>
                      ) : null}
                    </div>
                  </FormSection>

                  <FormSection
                    title="Generate type"
                    description="Choose what the AI should produce in this run."
                  >
                    <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-input-bg)]/50 p-1.5 sm:p-1">
                      {GEN_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setGenerationType(opt.value)}
                          className={cn(
                            'flex-1 min-w-[104px] rounded-lg px-3 py-2.5 text-center text-xs font-semibold leading-snug transition sm:min-w-[100px] sm:py-2.5 sm:text-sm',
                            generationType === opt.value
                              ? 'bg-[var(--color-primary)] text-white shadow-sm'
                              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]/80'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </FormSection>

                  <FormSection
                    title="Job description"
                    description="Full text works best: responsibilities, tools, and must-have skills the ATS will scan for."
                  >
                    <Textarea
                      label="Job description"
                      placeholder="Paste the full posting: summary, requirements, and nice-to-haves. The closer you mirror the employer’s language, the stronger the tailored CV."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="min-h-[320px] text-[15px] leading-relaxed"
                    />
                    <div className="mt-2 space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700/60">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out',
                            jdLength >= 100
                              ? 'w-full bg-gradient-to-r from-emerald-500 to-teal-500'
                              : 'bg-gradient-to-r from-amber-400 to-orange-400'
                          )}
                          style={{ width: `${charProgress}%` }}
                        />
                      </div>
                      <p
                        className={cn(
                          'text-xs',
                          jdLength > 0 && jdLength < 100 ? 'text-amber-700' : 'text-[var(--color-muted)]'
                        )}
                      >
                        {jdLength.toLocaleString()} / 100+ characters to generate
                        {jdLength < 100 ? <span> · {Math.max(0, 100 - jdLength)} to go</span> : null}
                        <span className="text-[var(--color-muted)]"> · 50+ characters to analyse</span>
                      </p>
                    </div>
                  </FormSection>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="min-h-12 w-full flex-1 border border-[var(--color-border)] shadow-sm sm:min-w-0"
                      disabled={!canAnalyse}
                      loading={analysisState === 'loading'}
                      onClick={() => void handleAnalyse()}
                    >
                      {analysisState === 'loading' ? 'Analysing…' : 'Analyse job'}
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      className="min-h-12 w-full flex-1 shadow-md sm:min-w-0"
                      disabled={!canSubmit}
                      loading={isGenerating}
                      onClick={() => void handleGenerate()}
                    >
                      {isGenerating ? 'Working…' : genLabel}
                    </Button>
                  </div>
                </div>
              </div>

              <aside
                className="rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-5 sm:p-6"
                style={{ boxShadow: '0 2px 24px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.02)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                      Analyse
                    </p>
                    <h2 className="mt-0.5 font-display text-lg font-semibold">Insight panel</h2>
                  </div>
                  {insightShowAnalysis && analysis ? (
                    <span className="shrink-0 rounded-full border border-[var(--color-border)]/80 bg-[var(--color-input-bg)]/60 px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
                      Score {matchPct}%
                    </span>
                  ) : null}
                </div>

                <div
                  className="mt-5 min-h-[280px] sm:min-h-[360px] lg:max-h-[min(70vh,680px)] lg:overflow-y-auto lg:pr-1"
                >
                  {generatePreview ? (
                    <div className="space-y-4 text-sm text-[var(--color-text-primary)]">
                      <div className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4 text-emerald-950">
                        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                          <p className="font-semibold">Your draft is ready</p>
                          <p className="mt-1 text-xs leading-relaxed text-emerald-900/90">
                            Opening the editor in a moment — you can still edit everything before saving.
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        Preview snippet
                      </p>
                      <div className="rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-input-bg)]/50 p-4 text-xs leading-relaxed sm:text-sm">
                        <p className="line-clamp-[14] whitespace-pre-wrap break-words text-[var(--color-text-primary)]">
                          {generatePreview}
                        </p>
                      </div>
                    </div>
                  ) : isGenerating && !generatePreview ? (
                    <div className="space-y-4 text-sm text-[var(--color-muted)]">
                      <div className="flex items-center gap-2 font-medium text-[var(--color-text-primary)]">
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
                        Preparing your tailored content…
                      </div>
                      <p className="text-xs leading-relaxed sm:text-sm">
                        When ready, a short preview appears here, then the full editor opens automatically.
                      </p>
                      <div className="space-y-3">
                        <Skeleton className="h-8 w-4/5" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-5/6" />
                        <Skeleton className="h-3.5 w-2/3" />
                        <Skeleton className="h-28 w-full" />
                      </div>
                    </div>
                  ) : analysisState === 'loading' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--color-muted)]">Comparing the posting to your base CV…</p>
                      <div className="space-y-3">
                        <Skeleton className="h-9 w-3/4" />
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-5/6" />
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </div>
                  ) : analysisState === 'error' ? (
                    <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-4 text-sm text-red-900">
                      <p className="font-medium">Couldn&apos;t analyse this job</p>
                      <p className="mt-1 leading-relaxed">{analysisError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={() => void handleAnalyse()}
                      >
                        Try again
                      </Button>
                    </div>
                  ) : insightShowAnalysis && analysis ? (
                    <div className="space-y-5 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)]/60 pb-4">
                        <div className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-muted)]" />
                          <div>
                            <p className="font-display text-base font-semibold leading-snug text-[var(--color-text-primary)]">
                              {[analysis.jobTitle, analysis.company].filter(Boolean).join(' at ') ||
                                'Role analysis'}
                            </p>
                            {analysis.region ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)]">
                                <MapPin className="h-3.5 w-3.5" />
                                {analysis.region}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {analysis.workType ? (
                          <Badge variant="default" className="shrink-0 capitalize">
                            {analysis.workType}
                          </Badge>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                          Match score
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-600/50">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-700 ease-out"
                              style={{ width: `${matchPct}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                            {matchPct}%
                          </span>
                        </div>
                      </div>

                      {analysis.whyGoodFit.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Strengths</p>
                          <ul className="mt-2 list-outside list-disc space-y-1.5 pl-4 leading-relaxed text-[var(--color-text-primary)]">
                            {analysis.whyGoodFit.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {analysis.keywords.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Missing or highlight keywords
                          </p>
                          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                            Terms the role weights — weave the ones you genuinely have into your bullets.
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {analysis.keywords.map((k) => (
                              <li key={k}>
                                <Badge variant="default" className="whitespace-nowrap font-normal">
                                  {k}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {analysis.keyRequirements.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Suggestions
                          </p>
                          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
                            What the posting is signalling — use as a checklist for your next edit pass.
                          </p>
                          <ol className="mt-2 list-outside list-decimal space-y-1.5 pl-4 text-[var(--color-text-primary)]">
                            {analysis.keyRequirements.slice(0, 8).map((r) => (
                              <li key={r} className="leading-relaxed">
                                {r}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}

                      {analysis.whyNotGoodFit.length > 0 ? (
                        <div>
                          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Gaps to address
                          </p>
                          <ul className="mt-2 list-outside list-disc space-y-1.5 pl-4 text-[var(--color-text-primary)]">
                            {analysis.whyNotGoodFit.map((x) => (
                              <li key={x} className="leading-relaxed">
                                {x}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {analysis.shortDescription ? (
                        <div className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-input-bg)]/30 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            About the role
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-primary)]">
                            {analysis.shortDescription}
                          </p>
                        </div>
                      ) : null}

                      {analysis.jobSummary ? (
                        <details className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-input-bg)]/20 p-3 sm:p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-[var(--color-text-primary)]">
                            Full job context
                            <span className="ml-1.5 text-xs font-normal text-[var(--color-muted)]">
                              (long-form, from analysis — optional read)
                            </span>
                          </summary>
                          <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-primary)] sm:text-sm">
                            {analysis.jobSummary}
                          </p>
                        </details>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[240px] flex-col">
                      <div className="flex grow flex-col items-center justify-center text-center sm:px-1">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-[var(--color-border)] bg-[var(--color-input-bg)]/30">
                          <FileText className="h-5 w-5 text-[var(--color-muted)]" />
                        </div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">How this panel helps</p>
                        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
                          Run{' '}
                          <strong className="font-medium text-[var(--color-text-primary)]">Analyse job</strong> to see
                          match score, strengths, role keywords, and suggestions. Or go straight to{' '}
                          <strong className="font-medium text-[var(--color-text-primary)]">Generate</strong> — both
                          paths use the same job description and base CV.
                        </p>
                      </div>
                      <ul className="mt-4 space-y-2.5 text-xs text-[var(--color-muted)]">
                        <li className="flex gap-2 rounded-lg border border-[var(--color-border)]/40 bg-[var(--color-input-bg)]/25 px-3 py-2.5">
                          <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            Optional analysis compares your base CV to the role before you commit time to a full
                            generate.
                          </span>
                        </li>
                        <li className="flex gap-2 rounded-lg border border-[var(--color-border)]/40 bg-[var(--color-input-bg)]/25 px-3 py-2.5">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            After you generate, a short preview shows here, then the editor opens so you can review and
                            save.
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
