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
import { CoverLetterPrintPreviewFrame } from '@/components/cover-letter/CoverLetterPrintPreviewFrame';
import { DocumentPrintPreviewFrame } from '@/components/shared/DocumentPrintPreviewFrame';
import { ExportMenu } from '@/components/shared/ExportMenu';
import {
  downloadCvExport,
  exportCoverLetter,
  type ExportFormat,
} from '@/lib/export-client';
import {
  optimisedCvJsonToCvData,
  parseOptimisedCvText,
} from '@/lib/optimise-result';
import { cn } from '@/lib/utils';
import type { GenerationType, JobStatus } from '@/types';

const btnSecondarySm =
  'inline-flex min-w-[88px] items-center justify-center gap-2 rounded-btn border border-[var(--color-border)] bg-[var(--color-glass-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] backdrop-blur-sm transition hover:bg-[var(--color-hover-surface)] hover:border-[var(--color-border-hover)] active:scale-[0.98]';

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

  const [clPreviewUrl, setClPreviewUrl] = useState<string | null>(null);
  const [clPreviewBusy, setClPreviewBusy] = useState(false);
  const [clPreviewError, setClPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      router.replace('/cv/optimise');
    }
  }, [draft, router]);

  useEffect(() => {
    return () => {
      setClPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

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
    const cvData = optimisedCvJsonToCvData(parsed.object);
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
            cv: JSON.parse(JSON.stringify(cvData)) as Record<string, unknown>,
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
      setClPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setClPreviewError(null);
      return;
    }
    if (!clText.trim() || !draft?.originalCvId) {
      setClPreviewError(
        !draft?.originalCvId
          ? 'Missing base CV reference for letter preview.'
          : null
      );
      setClPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
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
            setClPreviewUrl((prev) => {
              if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
              return null;
            });
          }
          return;
        }
        if (!cancelled) {
          const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          setClPreviewUrl((prev) => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return url;
          });
        }
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

  const performSave = useCallback(
    async (
      scope: GenerationType = 'both'
    ): Promise<{
      jobId: string | null;
      cvId: string | null;
      coverLetterId: string | null;
    }> => {
      const cur = useOptimiseDraftStore.getState().draft;
      if (!cur) throw new Error('No draft data. Return to optimise and try again.');

      const wantsCv = scope === 'cv' || scope === 'both';
      const wantsCl = scope === 'coverLetter' || scope === 'both';

      // Already have what was requested — reuse without re-inserting
      if (wantsCv && !wantsCl && cur.savedCvId) {
        return {
          jobId: cur.savedJobId,
          cvId: cur.savedCvId,
          coverLetterId: cur.savedCoverLetterId ?? null,
        };
      }
      if (wantsCl && !wantsCv && cur.savedCoverLetterId) {
        return {
          jobId: cur.savedJobId,
          cvId: cur.savedCvId,
          coverLetterId: cur.savedCoverLetterId,
        };
      }
      if (wantsCv && wantsCl && cur.savedCvId && cur.savedCoverLetterId) {
        return {
          jobId: cur.savedJobId,
          cvId: cur.savedCvId,
          coverLetterId: cur.savedCoverLetterId,
        };
      }

      // Partial: only save what's still missing
      const needCv = wantsCv && !cur.savedCvId;
      const needCl = wantsCl && !cur.savedCoverLetterId;
      if (!needCv && !needCl) {
        return {
          jobId: cur.savedJobId,
          cvId: cur.savedCvId,
          coverLetterId: cur.savedCoverLetterId ?? null,
        };
      }

      const effectiveGen: GenerationType =
        needCv && needCl ? 'both' : needCv ? 'cv' : 'coverLetter';

      const hasJd = Boolean(cur.jobDescription.trim());
      const cvContent = cur.cv;
      const coverLetterContent = cur.coverLetter;

      let jobId = cur.savedJobId;

      if (hasJd && !jobId) {
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
        jobId = job.id;
      }

      let res: Response;
      try {
        res = await fetch('/api/cvs/save-optimised', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvContent: needCv ? cvContent : undefined,
            coverLetterContent: needCl ? coverLetterContent : undefined,
            originalCvId: cur.originalCvId,
            jobId: jobId ?? null,
            generationType: effectiveGen,
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
        console.error('save-optimised', t);
        const label =
          effectiveGen === 'cv'
            ? 'Failed to save CV.'
            : effectiveGen === 'coverLetter'
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

      const next = {
        ...cur,
        savedJobId: jobId ?? null,
        savedCvId: out.cvId ?? cur.savedCvId,
        savedCoverLetterId: out.coverLetterId ?? cur.savedCoverLetterId ?? null,
        isTracked: cur.isTracked,
      };
      setStoreDraft(next);
      return {
        jobId: next.savedJobId,
        cvId: next.savedCvId,
        coverLetterId: next.savedCoverLetterId ?? null,
      };
    },
    [setStoreDraft]
  );

  const invalidateAfterSave = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['optimise-job-status'] });
    void qc.invalidateQueries({ queryKey: ['all-cvs'] });
    void qc.invalidateQueries({ queryKey: ['cover-letters'] });
    void qc.invalidateQueries({ queryKey: ['job-specific-cvs'] });
  }, [qc]);

  const handleSaveClick = useCallback(
    async (scope: GenerationType = 'both') => {
      if (!draft) return;
      const wantsCv = scope === 'cv' || scope === 'both';
      const wantsCl = scope === 'coverLetter' || scope === 'both';
      if (wantsCv && wantsCl && draft.savedCvId && draft.savedCoverLetterId) return;
      if (wantsCv && !wantsCl && draft.savedCvId) return;
      if (wantsCl && !wantsCv && draft.savedCoverLetterId) return;

      setIsSaving(true);
      try {
        await performSave(scope);
        const updated = useOptimiseDraftStore.getState().draft;
        const fullySaved =
          (gen === 'cv' && Boolean(updated?.savedCvId)) ||
          (gen === 'coverLetter' && Boolean(updated?.savedCoverLetterId)) ||
          (gen === 'both' &&
            Boolean(updated?.savedCvId) &&
            Boolean(updated?.savedCoverLetterId));
        if (fullySaved) setIsSaved(true);
        toast(
          scope === 'cv'
            ? 'CV saved'
            : scope === 'coverLetter'
              ? 'Cover letter saved'
              : 'Saved successfully',
          'success'
        );
        invalidateAfterSave();
      } catch (e) {
        const m =
          e instanceof Error ? e.message : 'Could not save. Please try again.';
        toast(m, 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [draft, performSave, toast, invalidateAfterSave, gen]
  );

  const trackMutation = useMutation({
    mutationFn: async () => {
      let d = useOptimiseDraftStore.getState().draft;
      if (!d) throw new Error('No draft data.');
      let jobId = d.savedJobId;
      if (!jobId) {
        const r = await performSave(gen === 'coverLetter' ? 'coverLetter' : gen === 'cv' ? 'cv' : 'both');
        jobId = r.jobId;
        const updated = useOptimiseDraftStore.getState().draft;
        if (
          (gen === 'cv' && updated?.savedCvId) ||
          (gen === 'coverLetter' && updated?.savedCoverLetterId) ||
          (gen === 'both' && updated?.savedCvId && updated?.savedCoverLetterId)
        ) {
          setIsSaved(true);
        }
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

  const handleDownloadCv = useCallback(
    async (format: ExportFormat = 'pdf') => {
      const d = useOptimiseDraftStore.getState().draft;
      if (!d?.savedCvId) {
        toast('Save first to download.', 'error');
        return;
      }
      setDownloadBusy(true);
      try {
        const result = await downloadCvExport({ job_cv_id: d.savedCvId }, format);
        if (result === 'upgrade_required') {
          toast('DOCX export is a Pro feature. Upgrade to unlock.', 'error');
        } else if (result === 'error') {
          toast('Could not download.', 'error');
        }
      } finally {
        setDownloadBusy(false);
      }
    },
    [toast]
  );

  const handleDownloadCoverLetter = useCallback(
    async (format: ExportFormat = 'pdf') => {
      const d = useOptimiseDraftStore.getState().draft;
      if (!d?.savedCoverLetterId) {
        toast('Save first to download.', 'error');
        return;
      }
      setDownloadBusy(true);
      try {
        const result = await exportCoverLetter(
          {
            id: d.savedCoverLetterId,
            content: d.coverLetter ?? '',
            company_name: d.analysis?.company ?? d.companyName ?? null,
            job_title: d.analysis?.jobTitle ?? d.jobTitle ?? null,
          },
          format
        );
        if (result === 'upgrade_required') {
          toast('DOCX export is a Pro feature. Upgrade to unlock.', 'error');
        } else if (result === 'error') {
          toast('Export failed.', 'error');
        }
      } finally {
        setDownloadBusy(false);
      }
    },
    [toast]
  );

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
                        savedCvId: draft.savedCvId ?? null,
                        savedCoverLetterId: draft.savedCoverLetterId ?? null,
                        coverLetter: draft.coverLetter,
                        generationType: draft.generationType,
                        jobDescription: draft.jobDescription,
                        jobUrl: draft.jobUrl,
                        analysis: draft.analysis,
                        isTracked: draft.isTracked,
                        aiChangesSummary: draft.aiChangesSummary ?? null,
                        extractedKeywords: draft.extractedKeywords ?? [],
                        bulletsImproved: draft.bulletsImproved ?? 0,
                        coverLetterTone: draft.coverLetterTone,
                        coverLetterLength: draft.coverLetterLength,
                        coverLetterEmphasis: draft.coverLetterEmphasis ?? null,
                      });
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit CV
                  </Link>
                )}
                {!hasSavedCv ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-w-[88px]"
                    disabled={isSaving}
                    loading={isSaving}
                    onClick={() => void handleSaveClick('cv')}
                  >
                    Save CV
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled className="min-w-[88px]">
                    CV saved ✓
                  </Button>
                )}
                {hasSavedCv ? (
                  <ExportMenu
                    busyFormat={downloadBusy ? 'pdf' : null}
                    canDocx
                    label="Download"
                    onExport={(format) => void handleDownloadCv(format)}
                  />
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
                {!hasSavedCl ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-w-[88px]"
                    disabled={isSaving}
                    loading={isSaving}
                    onClick={() => void handleSaveClick('coverLetter')}
                  >
                    Save cover letter
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" disabled className="min-w-[88px]">
                    Letter saved ✓
                  </Button>
                )}
                {hasSavedCl ? (
                  <ExportMenu
                    busyFormat={downloadBusy ? 'pdf' : null}
                    canDocx
                    label="Download"
                    onExport={(format) => void handleDownloadCoverLetter(format)}
                  />
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
                previewUrl={clPreviewUrl}
              />
            )}
          </div>
        ) : gen === 'coverLetter' ? (
          <ClPreviewPane
            busy={clPreviewBusy}
            error={clPreviewError}
            previewUrl={clPreviewUrl}
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
          {gen === 'both' ? (
            <Button
              variant="primary"
              size="lg"
              className="min-w-[200px]"
              disabled={
                isSaving || Boolean(hasSavedCv && hasSavedCl)
              }
              loading={isSaving}
              onClick={() => void handleSaveClick('both')}
            >
              {hasSavedCv && hasSavedCl
                ? 'Saved ✓'
                : 'Save CV and cover letter'}
            </Button>
          ) : gen === 'cv' ? (
            <Button
              variant="primary"
              size="lg"
              className="min-w-[140px]"
              disabled={isSaving || hasSavedCv}
              loading={isSaving}
              onClick={() => void handleSaveClick('cv')}
            >
              {hasSavedCv ? 'Saved ✓' : 'Save CV'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="min-w-[180px]"
              disabled={isSaving || hasSavedCl}
              loading={isSaving}
              onClick={() => void handleSaveClick('coverLetter')}
            >
              {hasSavedCl ? 'Saved ✓' : 'Save cover letter'}
            </Button>
          )}

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!html) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <div className="relative max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-slate-100 p-3">
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Rendering preview…
        </div>
      ) : null}
      {error ? (
        <p className="p-4 text-sm text-[var(--color-accent-coral)]">{error}</p>
      ) : null}
      {!error && previewUrl ? (
        <DocumentPrintPreviewFrame
          src={previewUrl}
          title="CV preview"
          isLoading={busy}
        />
      ) : !error && !busy ? (
        <p className="p-4 text-sm text-[var(--color-muted)]">No preview.</p>
      ) : null}
    </div>
  );
}

function ClPreviewPane({
  previewUrl,
  busy,
  error,
}: {
  previewUrl: string | null;
  busy: boolean;
  error: string | null;
}) {
  return (
    <div className="relative max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-slate-100 p-3">
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Rendering preview…
        </div>
      ) : null}
      {error ? (
        <p className="p-4 text-sm text-[var(--color-accent-coral)]">{error}</p>
      ) : null}
      {!error && previewUrl ? (
        <CoverLetterPrintPreviewFrame
          src={previewUrl}
          title="Cover letter preview"
          isLoading={busy}
        />
      ) : !error && !busy ? (
        <p className="p-4 text-sm text-[var(--color-muted)]">No preview.</p>
      ) : null}
    </div>
  );
}
