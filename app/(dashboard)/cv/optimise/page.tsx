/*
 * OPTIMISE FLOW (internal analysis summary)
 * - Next.js 14 app router; dashboard routes under app/(dashboard)/cv/optimise.
 * - Generation: POST /api/cv/optimise uses CLAUDE_MODEL (ANTHROPIC_MODEL); optional POST /api/jobs/analyze uses CV_ANALYZER_API_MODEL (Haiku).
 * - Results are passed to /cv/optimise/result via zustand store useOptimiseDraftStore (no localStorage).
 * - DB: jobs (job_title, company_name, job_url, keywords JSONB, job_summary); applied_jobs links user↔job; cvs/cover_letters via save-optimised.
 * - Cover letter standalone page uses the same optimise API with generationType coverLetter (GenerateCoverLetterForm).
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Building2, MapPin } from 'lucide-react';
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

export default function CVOptimisePage() {
  const router = useRouter();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const setOptimiseDraft = useOptimiseDraftStore((s) => s.setDraft);
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

  const isFree = tier === 'free';
  const jdLength = jobDescription.trim().length;
  const canSubmit =
    jdLength >= 100 && !isFree && !!baseCoreCvId && !isGenerating;
  const canAnalyse =
    jdLength >= 50 && !isFree && !!baseCoreCvId && analysisState !== 'loading';

  useEffect(() => {
    if (!coreVersionsLoading && baseCoreCvId == null && coreVersions.length > 0) {
      setBaseCoreCvId(coreVersions[0].id);
    }
  }, [coreVersionsLoading, coreVersions, baseCoreCvId]);

  useEffect(() => {
    setJobUrlWarning(Boolean(jobUrl.trim()) && !isProbablyValidUrl(jobUrl));
  }, [jobUrl]);

  const handleAnalyse = useCallback(async () => {
    if (!baseCoreCvId) return;
    setAnalysisState('loading');
    setAnalysisError(null);
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
      router.push('/cv/optimise/result');
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
    toast,
  ]);

  const genLabel =
    generationType === 'cv'
      ? 'Generate CV'
      : generationType === 'coverLetter'
        ? 'Generate Cover Letter'
        : 'Generate CV + Cover Letter';

  const matchPct = analysis?.matchPercentage ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      {isGenerating && (
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
              Tailoring CV Intelligence Engine
            </p>
            <p className="relative z-10 mt-2 text-sm text-slate-200">
              Analyzing role fit, boosting ATS signals, and rewriting for impact.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Optimise CV for a job</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Paste the job description below. AI will tailor your CV using only your real experience.
            Analysis is optional — you can generate without it.
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
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
                  label="Job title (optional)"
                  placeholder="e.g. Senior Product Manager — inferred if empty"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <Input
                  label="Company name (optional)"
                  placeholder="e.g. Figma — inferred if empty"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  label="Job Posting URL (optional)"
                  placeholder="https://linkedin.com/jobs/..."
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                />
                {jobUrlWarning ? (
                  <p className="text-xs text-amber-700">That doesn&apos;t look like a valid http(s) URL — you can still continue.</p>
                ) : null}

                <div>
                  <span className="mb-2 block text-sm font-medium">Generate</span>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-1">
                    {GEN_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGenerationType(opt.value)}
                        className={cn(
                          'flex-1 min-w-[100px] rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm',
                          generationType === opt.value
                            ? 'bg-[var(--color-primary)] text-white shadow'
                            : 'text-[var(--color-text-primary)] hover:bg-white/50'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Textarea
                    label="Job Description"
                    placeholder="Paste the full job description here. The more complete, the better the match..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="min-h-[280px]"
                  />
                  <p
                    className={`mt-1 text-xs ${
                      jdLength > 0 && jdLength < 100 ? 'text-red-500' : 'text-[var(--color-muted)]'
                    }`}
                  >
                    {jdLength} / 100 characters minimum for generation
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full border-2"
                  disabled={!canAnalyse}
                  onClick={() => void handleAnalyse()}
                >
                  {analysisState === 'loading' ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analysing…
                    </span>
                  ) : (
                    'Analyse Job'
                  )}
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!canSubmit}
                  onClick={() => void handleGenerate()}
                >
                  {genLabel}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6 lg:min-h-[480px]">
              {analysisState === 'idle' ? (
                <p className="text-sm text-[var(--color-muted)]">
                  Run <strong>Analyse Job</strong> to see fit score, strengths, and gaps — or generate directly.
                </p>
              ) : null}

              {analysisState === 'loading' ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : null}

              {analysisState === 'error' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="font-medium">Couldn&apos;t analyse this job</p>
                  <p className="mt-1">{analysisError}</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => void handleAnalyse()}>
                    Retry
                  </Button>
                </div>
              ) : null}

              {analysisState === 'done' && analysis ? (
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-muted)]" />
                      <div>
                        <p className="font-display text-base font-semibold leading-snug">
                          {[analysis.jobTitle, analysis.company].filter(Boolean).join(' at ') ||
                            'Role analysis'}
                        </p>
                        {analysis.region ? (
                          <p className="mt-1 flex items-center gap-1 text-[var(--color-muted)]">
                            <MapPin className="h-3.5 w-3.5" />
                            {analysis.region}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {analysis.workType ? (
                      <Badge variant="default" className="capitalize">
                        {analysis.workType}
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      About the Role
                    </p>
                    <p className="mt-2 leading-relaxed text-[var(--color-text-primary)]">
                      {analysis.shortDescription}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      Key Requirements
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {analysis.keyRequirements.slice(0, 8).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                      Your Match Score
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-700 ease-out"
                          style={{ width: `${matchPct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{matchPct}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                      Why You&apos;re a Good Fit
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {analysis.whyGoodFit.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Gaps to Address
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {analysis.whyNotGoodFit.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
