/*
 * ANALYSIS (schema, routes, flow) — pre-implementation findings
 * - cover_letters: migration 011 defines `name`, but legacy DBs from 001 skip CREATE TABLE IF NOT EXISTS
 *   so `name` may be absent → PGRST204. save-optimised and POST /api/cover-letters omit `name` on insert.
 * - Candidate name: `cvs.full_name` (not personal_info JSONB in current schema). Optimise route passes
 *   candidateNameFromCv into lib/claude cover letter prompt; save-optimised sets applicant_name from
 *   original CV row.
 * - CV edit: /cv/job-specific/[id]/edit — id=uuid for saved; id=draft loads Zustand useOptimiseEditDraftStore.
 * - Cover letter edit: /cover-letters/[id] — saved id; id=draft loads clEditDraft from same store.
 * - Draft → result: useOptimiseDraftStore (setDraft on optimise page); no localStorage / no URL HTML.
 * - jobs/save + save-optimised: see optimise page comment for DB shape.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Tabs } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import { useOptimiseEditDraftStore } from '@/stores/useOptimiseEditDraftStore';
import { parseOptimisedCvText } from '@/lib/optimise-result';
import { cn } from '@/lib/utils';
import type { GenerationType, JobStatus } from '@/types';

const btnSecondarySm =
  'inline-flex min-w-[88px] items-center justify-center gap-2 rounded-btn border border-[var(--color-border)] bg-[var(--color-glass-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] backdrop-blur-sm transition hover:bg-white/[0.06] hover:border-[var(--color-border-hover)] active:scale-[0.98]';

const CV_DOC_WIDTH = 794;
const CV_DOC_HEIGHT = 1123;

export default function OptimiseResultPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const draft = useOptimiseDraftStore((s) => s.draft);
  const setStoreDraft = useOptimiseDraftStore((s) => s.setDraft);
  const clearDraft = useOptimiseDraftStore((s) => s.clearDraft);
  const setCvEditDraft = useOptimiseEditDraftStore((s) => s.setCvEditDraft);
  const setClEditDraft = useOptimiseEditDraftStore((s) => s.setClEditDraft);

  const [activeTab, setActiveTab] = useState<'cv' | 'coverLetter'>('cv');
  const [isSaved, setIsSaved] = useState(() =>
    Boolean(draft?.savedCvId || draft?.savedCoverLetterId)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const [cvPreviewHtml, setCvPreviewHtml] = useState('');
  const [cvPreviewBusy, setCvPreviewBusy] = useState(false);
  const [cvPreviewError, setCvPreviewError] = useState<string | null>(null);

  const [clPreviewHtml, setClPreviewHtml] = useState('');
  const [clPreviewBusy, setClPreviewBusy] = useState(false);
  const [clPreviewError, setClPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      router.replace('/cv/optimise');
    }
  }, [draft, router]);

  const savedJobId = draft?.savedJobId ?? null;

  const { data: savedJobRow, isLoading: trackCheckLoading } = useQuery({
    queryKey: ['optimise-job-status', savedJobId],
    queryFn: async (): Promise<{ status: JobStatus }> => {
      const res = await fetch(`/api/jobs/${savedJobId}`);
      if (!res.ok) throw new Error('job_fetch_failed');
      return res.json() as Promise<{ status: JobStatus }>;
    },
    enabled: Boolean(isSaved && savedJobId && draft?.jobDescription?.trim()),
    staleTime: 30 * 1000,
  });

  const tracked = savedJobRow
    ? savedJobRow.status !== 'none'
    : Boolean(draft?.isTracked);

  const gen = draft?.generationType ?? 'cv';
  const cvText = draft?.cv ?? '';
  const clText = draft?.coverLetter ?? '';

  useEffect(() => {
    if (gen !== 'cv' && gen !== 'both') {
      setCvPreviewHtml('');
      setCvPreviewError(null);
      return;
    }
    const parsed = parseOptimisedCvText(cvText);
    if (!parsed.ok) {
      setCvPreviewError(parsed.message);
      setCvPreviewHtml('');
      return;
    }
    let cancelled = false;
    setCvPreviewBusy(true);
    setCvPreviewError(null);
    void (async () => {
      try {
        const res = await fetch('/api/cv/preview-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: 'classic',
            accent_color: '#6C63FF',
            cv: parsed.object,
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          console.error('cv preview-html', text);
          if (!cancelled) {
            setCvPreviewError('Could not render CV preview.');
            setCvPreviewHtml('');
          }
          return;
        }
        if (!cancelled) setCvPreviewHtml(text);
      } catch (e) {
        console.error(e);
        if (!cancelled) setCvPreviewError('Could not render CV preview.');
      } finally {
        if (!cancelled) setCvPreviewBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cvText, gen]);

  useEffect(() => {
    if (gen !== 'coverLetter' && gen !== 'both') {
      setClPreviewHtml('');
      setClPreviewError(null);
      return;
    }
    if (!clText.trim() || !draft?.originalCvId) {
      setClPreviewError(
        !draft?.originalCvId
          ? 'Missing base CV reference for letter preview.'
          : null
      );
      setClPreviewHtml('');
      return;
    }
    let cancelled = false;
    setClPreviewBusy(true);
    setClPreviewError(null);
    void (async () => {
      try {
        const res = await fetch('/api/cover-letter/preview-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: 'cl-classic',
            accent_color: '#2563EB',
            content: clText,
            original_cv_id: draft.originalCvId,
            company_name: draft.analysis?.company ?? draft.companyName ?? null,
            job_title: draft.analysis?.jobTitle ?? draft.jobTitle ?? null,
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          console.error('cover-letter preview-html', text);
          if (!cancelled) {
            setClPreviewError('Could not render cover letter preview.');
            setClPreviewHtml('');
          }
          return;
        }
        if (!cancelled) setClPreviewHtml(text);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setClPreviewError('Could not render cover letter preview.');
        }
      } finally {
        if (!cancelled) setClPreviewBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    clText,
    gen,
    draft?.originalCvId,
    draft?.analysis?.company,
    draft?.analysis?.jobTitle,
    draft?.companyName,
    draft?.jobTitle,
  ]);

  const performSave = useCallback(async (): Promise<{
    jobId: string | null;
    cvId: string | null;
  }> => {
    const cur = useOptimiseDraftStore.getState().draft;
    if (!cur) throw new Error('No draft data. Return to optimise and try again.');
    if (cur.savedCvId || cur.savedCoverLetterId) {
      return { jobId: cur.savedJobId, cvId: cur.savedCvId };
    }

    const g: GenerationType = cur.generationType;
    const hasJd = Boolean(cur.jobDescription.trim());
    const cvContent = cur.cv;
    const coverLetterContent = cur.coverLetter;

    if (!hasJd) {
      let res: Response;
      try {
        res = await fetch('/api/cvs/save-optimised', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvContent: g !== 'coverLetter' ? cvContent : undefined,
            coverLetterContent: g !== 'cv' ? coverLetterContent : undefined,
            originalCvId: cur.originalCvId,
            jobId: null,
            generationType: g,
            ai_changes_summary: cur.aiChangesSummary ?? null,
            keywords_added: cur.extractedKeywords ?? [],
            bullets_improved: cur.bulletsImproved ?? 0,
            coverLetterTone: cur.coverLetterTone,
            coverLetterLength: cur.coverLetterLength,
            coverLetterEmphasis: cur.coverLetterEmphasis,
          }),
        });
      } catch (e) {
        console.error('save-optimised (no job) network', e);
        throw new Error('Network error while saving. Check your connection.');
      }
      if (!res.ok) {
        const t = await res.text();
        console.error('save-optimised (no job)', t);
        const label =
          g === 'cv'
            ? 'Failed to save CV.'
            : g === 'coverLetter'
              ? 'Failed to save cover letter.'
              : 'Failed to save CV and cover letter.';
        throw new Error(label);
      }
      let out: { cvId: string | null; coverLetterId: string | null };
      try {
        out = (await res.json()) as {
          cvId: string | null;
          coverLetterId: string | null;
        };
      } catch (e) {
        console.error('save-optimised JSON parse', e);
        throw new Error('Invalid response from server after save.');
      }
      setStoreDraft({
        ...cur,
        savedJobId: null,
        savedCvId: out.cvId,
        savedCoverLetterId: out.coverLetterId,
        isTracked: false,
      });
      return { jobId: null, cvId: out.cvId };
    }

    let jobRes: Response;
    try {
      jobRes = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cur.jobUrl || undefined,
          keywords: cur.analysis?.keywords?.length
            ? cur.analysis.keywords
            : cur.extractedKeywords ?? [],
          jobSummary: cur.analysis?.jobSummary ?? '',
          title: cur.analysis?.jobTitle ?? cur.jobTitle ?? undefined,
          company: cur.analysis?.company ?? cur.companyName ?? undefined,
        }),
      });
    } catch (e) {
      console.error('jobs/save network', e);
      throw new Error('Network error while saving the job. Check your connection.');
    }
    if (!jobRes.ok) {
      const t = await jobRes.text();
      console.error('jobs/save', t);
      throw new Error('Failed to save job.');
    }
    let job: { id: string };
    try {
      job = (await jobRes.json()) as { id: string };
    } catch (e) {
      console.error('jobs/save JSON parse', e);
      throw new Error('Invalid response after saving job.');
    }
    if (!job?.id) {
      throw new Error('Job was saved but no id was returned.');
    }

    let res: Response;
    try {
      res = await fetch('/api/cvs/save-optimised', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvContent: g !== 'coverLetter' ? cvContent : undefined,
          coverLetterContent: g !== 'cv' ? coverLetterContent : undefined,
          originalCvId: cur.originalCvId,
          jobId: job.id,
          generationType: g,
          ai_changes_summary: cur.aiChangesSummary ?? null,
          keywords_added: cur.extractedKeywords ?? [],
          bullets_improved: cur.bulletsImproved ?? 0,
          coverLetterTone: cur.coverLetterTone,
          coverLetterLength: cur.coverLetterLength,
          coverLetterEmphasis: cur.coverLetterEmphasis,
        }),
      });
    } catch (e) {
      console.error('save-optimised network', e);
      throw new Error('Network error while saving your CV or cover letter.');
    }
    if (!res.ok) {
      const t = await res.text();
      console.error('save-optimised (with job)', t);
      const label =
        g === 'cv'
          ? 'Failed to save CV.'
          : g === 'coverLetter'
            ? 'Failed to save cover letter.'
            : 'Failed to save CV and cover letter.';
      throw new Error(label);
    }
    let out: { cvId: string | null; coverLetterId: string | null };
    try {
      out = (await res.json()) as {
        cvId: string | null;
        coverLetterId: string | null;
      };
    } catch (e) {
      console.error('save-optimised JSON parse', e);
      throw new Error('Invalid response after saving documents.');
    }
    setStoreDraft({
      ...cur,
      savedJobId: job.id,
      savedCvId: out.cvId,
      savedCoverLetterId: out.coverLetterId,
      isTracked: false,
    });
    return { jobId: job.id, cvId: out.cvId };
  }, [setStoreDraft]);

  const handleSaveClick = useCallback(async () => {
    if (!draft || isSaved) return;
    setIsSaving(true);
    try {
      await performSave();
      setIsSaved(true);
      toast('Saved successfully', 'success');
      void qc.invalidateQueries({ queryKey: ['optimise-job-status'] });
    } catch (e) {
      const m =
        e instanceof Error ? e.message : 'Could not save. Please try again.';
      toast(m, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [draft, isSaved, performSave, toast, qc]);

  const trackMutation = useMutation({
    mutationFn: async () => {
      let d = useOptimiseDraftStore.getState().draft;
      if (!d) throw new Error('No draft data.');
      let jobId = d.savedJobId;
      if (!jobId) {
        const r = await performSave();
        jobId = r.jobId;
        setIsSaved(true);
      }
      if (!jobId) throw new Error('Save the job context first, then track.');
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'apply_later' as JobStatus }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('jobs status PATCH', t);
        throw new Error('Could not add job to tracker.');
      }
      d = useOptimiseDraftStore.getState().draft;
      if (d) setStoreDraft({ ...d, isTracked: true });
    },
    onSuccess: () => {
      toast('Job added to your tracker', 'success');
      void qc.invalidateQueries({ queryKey: ['optimise-job-status'] });
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    },
    onError: (error: Error) => {
      toast(
        error instanceof Error ? error.message : 'Could not add job to tracker.',
        'error'
      );
    },
  });

  const untrackMutation = useMutation({
    mutationFn: async () => {
      const d = useOptimiseDraftStore.getState().draft;
      const jid = d?.savedJobId;
      if (!jid) throw new Error('No saved job to untrack.');
      const res = await fetch(`/api/jobs/${jid}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'none' as JobStatus }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('jobs status PATCH untrack', t);
        throw new Error('Could not remove from tracker.');
      }
      if (d) setStoreDraft({ ...d, isTracked: false });
    },
    onSuccess: () => {
      toast('Removed from tracker', 'success');
      void qc.invalidateQueries({ queryKey: ['optimise-job-status'] });
      void qc.invalidateQueries({ queryKey: ['job-applications'] });
      void qc.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
    },
    onError: (error: Error) => {
      toast(
        error instanceof Error ? error.message : 'Could not remove from tracker.',
        'error'
      );
    },
  });

  const handleDownloadCv = useCallback(async () => {
    const d = useOptimiseDraftStore.getState().draft;
    if (!d?.savedCvId) {
      toast('Save first to download.', 'error');
      return;
    }
    setDownloadBusy(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          job_cv_id: d.savedCvId,
          template_id: 'classic',
          accent_color: '#6C63FF',
          format: 'pdf',
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('export cv', text);
        toast('Could not download PDF.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
      toast('Could not download PDF.', 'error');
    } finally {
      setDownloadBusy(false);
    }
  }, [toast]);

  const handleDownloadCoverLetter = useCallback(async () => {
    const d = useOptimiseDraftStore.getState().draft;
    if (!d?.savedCoverLetterId) {
      toast('Save first to download.', 'error');
      return;
    }
    setDownloadBusy(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cover_letter',
          id: d.savedCoverLetterId,
          templateId: 'cl-classic',
          content: d.coverLetter ?? '',
          accent_color: '#2563EB',
          company_name: d.analysis?.company ?? d.companyName ?? null,
          job_title: d.analysis?.jobTitle ?? d.jobTitle ?? null,
        }),
      });
      const j = (await res.json()) as { pdfUrl?: string; error?: string };
      if (j.pdfUrl) {
        window.open(j.pdfUrl, '_blank');
        return;
      }
      toast(
        j.error === 'invalid_template'
          ? 'This template is not available.'
          : 'Export failed.',
        'error'
      );
    } catch (e) {
      console.error(e);
      toast('Export failed.', 'error');
    } finally {
      setDownloadBusy(false);
    }
  }, [toast]);

  const trackBusy =
    trackCheckLoading || trackMutation.isPending || untrackMutation.isPending || isSaving;

  if (!draft) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center text-sm text-[var(--color-muted)]">
        Redirecting…
      </div>
    );
  }

  const showTabs = gen === 'both';
  const hasJobContext = Boolean(draft.jobDescription.trim());
  const hasSavedCv = Boolean(draft.savedCvId);
  const hasSavedCl = Boolean(draft.savedCoverLetterId);

  const showCvChrome = gen === 'cv' || gen === 'both';
  const showClChrome = gen === 'coverLetter' || gen === 'both';
  const activeChrome: 'cv' | 'coverLetter' = showTabs
    ? activeTab
    : gen === 'coverLetter'
      ? 'coverLetter'
      : 'cv';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Optimised result</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Review your draft below. Nothing is stored until you save.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/cv/optimise"
            onClick={() => clearDraft()}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {showCvChrome && activeChrome === 'cv' ? (
              <>
                {hasSavedCv ? (
                  <Link
                    href={`/cv/job-specific/${draft.savedCvId}/edit`}
                    className={cn(btnSecondarySm)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit CV
                  </Link>
                ) : (
                  <Link
                    href="/cv/job-specific/draft/edit"
                    className={cn(btnSecondarySm)}
                    onClick={() => {
                      setCvEditDraft({
                        cvContent: draft.cv ?? '',
                        originalCvId: draft.originalCvId,
                        jobTitle: draft.analysis?.jobTitle ?? draft.jobTitle ?? null,
                        companyName:
                          draft.analysis?.company ?? draft.companyName ?? null,
                        savedJobId: draft.savedJobId ?? null,
                        aiChangesSummary: draft.aiChangesSummary ?? null,
                        extractedKeywords: draft.extractedKeywords ?? [],
                        bulletsImproved: draft.bulletsImproved ?? 0,
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit CV
                  </Link>
                )}
                {hasSavedCv ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={downloadBusy}
                    onClick={() => void handleDownloadCv()}
                  >
                    {downloadBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Tooltip content="Save first to download">
                    <span className="inline-flex">
                      <Button variant="secondary" size="sm" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </>
            ) : null}
            {showClChrome && activeChrome === 'coverLetter' ? (
              <>
                {hasSavedCl ? (
                  <Link
                    href={`/cover-letters/${draft.savedCoverLetterId}`}
                    className={cn(btnSecondarySm)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit cover letter
                  </Link>
                ) : (
                  <Link
                    href="/cover-letters/draft"
                    className={cn(btnSecondarySm)}
                    onClick={() => {
                      setClEditDraft({
                        content: draft.coverLetter ?? '',
                        originalCvId: draft.originalCvId,
                        companyName:
                          draft.analysis?.company ?? draft.companyName ?? null,
                        jobTitle: draft.analysis?.jobTitle ?? draft.jobTitle ?? null,
                        tone: draft.coverLetterTone,
                        length: draft.coverLetterLength,
                        emphasis: draft.coverLetterEmphasis ?? null,
                        templateId: 'cl-classic',
                        savedJobId: draft.savedJobId ?? null,
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit cover letter
                  </Link>
                )}
                {hasSavedCl ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={downloadBusy}
                    onClick={() => void handleDownloadCoverLetter()}
                  >
                    {downloadBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Tooltip content="Save first to download">
                    <span className="inline-flex">
                      <Button variant="secondary" size="sm" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </>
            ) : null}
          </div>
        </div>

        {showTabs ? (
          <div>
            <Tabs
              className="mb-4 max-w-md"
              tabs={[
                { id: 'cv', label: 'CV' },
                { id: 'coverLetter', label: 'Cover Letter' },
              ]}
              value={activeTab}
              onChange={(id) => setActiveTab(id as 'cv' | 'coverLetter')}
            />
            {activeTab === 'cv' ? (
              <CvPreviewPane
                busy={cvPreviewBusy}
                error={cvPreviewError}
                html={cvPreviewHtml}
              />
            ) : (
              <ClPreviewPane
                busy={clPreviewBusy}
                error={clPreviewError}
                html={clPreviewHtml}
              />
            )}
          </div>
        ) : gen === 'coverLetter' ? (
          <ClPreviewPane
            busy={clPreviewBusy}
            error={clPreviewError}
            html={clPreviewHtml}
          />
        ) : (
          <CvPreviewPane
            busy={cvPreviewBusy}
            error={cvPreviewError}
            html={cvPreviewHtml}
          />
        )}

        {draft.aiChangesSummary && gen !== 'coverLetter' ? (
          <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4 text-sm leading-relaxed">
            {draft.aiChangesSummary}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            variant="primary"
            size="lg"
            className="min-w-[140px]"
            disabled={isSaved || isSaving}
            loading={isSaving}
            onClick={() => void handleSaveClick()}
          >
            {isSaved ? 'Saved ✓' : 'Save'}
          </Button>

          {hasJobContext ? (
            <Button
              variant="secondary"
              size="lg"
              className="min-w-[200px]"
              disabled={trackBusy}
              onClick={() => {
                if (tracked) {
                  untrackMutation.mutate();
                } else {
                  trackMutation.mutate();
                }
              }}
            >
              {trackCheckLoading && isSaved && savedJobId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </span>
              ) : tracked ? (
                '✓ Tracking — Click to Untrack'
              ) : (
                'Track Job'
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CvPreviewPane({
  html,
  busy,
  error,
}: {
  html: string;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="relative max-h-[min(70vh,720px)] overflow-y-auto overflow-x-auto rounded-xl border border-[var(--color-border)] bg-slate-100">
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Rendering preview…
        </div>
      ) : null}
      {error ? (
        <p className="p-4 text-sm text-[var(--color-accent-coral)]">{error}</p>
      ) : null}
      {!error && html ? (
        <div
          className="mx-auto flex justify-center p-4"
          style={{ minWidth: CV_DOC_WIDTH + 32 }}
        >
          <div
            className="relative overflow-hidden rounded-md bg-white shadow-sm"
            style={{ width: CV_DOC_WIDTH, minHeight: 400 }}
          >
            <iframe
              title="CV preview"
              className="pointer-events-none block max-w-none border-0"
              width={CV_DOC_WIDTH}
              height={CV_DOC_HEIGHT}
              srcDoc={html}
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        </div>
      ) : !error && !busy ? (
        <p className="p-4 text-sm text-[var(--color-muted)]">No preview.</p>
      ) : null}
    </div>
  );
}

function ClPreviewPane({
  html,
  busy,
  error,
}: {
  html: string;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="relative max-h-[min(70vh,720px)] overflow-y-auto overflow-x-auto rounded-xl border border-[var(--color-border)] bg-slate-100">
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Rendering preview…
        </div>
      ) : null}
      {error ? (
        <p className="p-4 text-sm text-[var(--color-accent-coral)]">{error}</p>
      ) : null}
      {!error && html ? (
        <div className="mx-auto flex justify-center p-4">
          <div
            className="relative overflow-hidden rounded-md bg-white shadow-sm"
            style={{ width: 794, minHeight: 200 }}
          >
            <iframe
              title="Cover letter preview"
              className="block max-w-none border-0"
              width={794}
              height={1123}
              srcDoc={html}
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        </div>
      ) : !error && !busy ? (
        <p className="p-4 text-sm text-[var(--color-muted)]">No preview.</p>
      ) : null}
    </div>
  );
}
