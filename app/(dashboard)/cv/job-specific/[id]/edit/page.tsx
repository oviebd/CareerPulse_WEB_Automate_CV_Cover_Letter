'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { ATSIndicator } from '@/components/cv/premium/ATSIndicator';
import { JobKeywordsBanner } from '@/components/cv/premium/JobKeywordsBanner';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import {
  useJobSpecificCV,
  useUpdateJobSpecificCV,
  useArchiveJobSpecificCV,
} from '@/hooks/useJobSpecificCVs';
import { useCoreCVVersions } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate } from '@/lib/utils';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { isKeywordPresentInCv } from '@/lib/cv-keyword-presence';
import { cloneCvData } from '@/lib/cv-clone';
import { useToast } from '@/components/ui/toast';
import { Undo2, Redo2, ChevronDown, ChevronUp } from 'lucide-react';
import { CV_FORM_CARD, CV_SHELL_HEADER } from '@/lib/cv-editor-styles';

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return {
    full_name: d.full_name,
    professional_title: d.professional_title,
    email: d.email,
    phone: d.phone,
    location: d.location,
    linkedin_url: d.linkedin_url,
    github_url: d.github_url,
    links: d.links ?? [],
    address: d.address ?? null,
    photo_url: d.photo_url ?? null,
    summary: d.summary,
    section_visibility: d.section_visibility ?? {},
    experience: d.experience ?? [],
    education: d.education ?? [],
    skills: d.skills ?? [],
    projects: d.projects ?? [],
    certifications: d.certifications ?? [],
    languages: d.languages ?? [],
    referrals: (d.referrals ?? []).slice(0, 2),
    awards: d.awards ?? [],
  };
}

function patchFromCvData(data: CVData, selectedTemplateId: string, accent: string) {
  return {
    full_name: data.full_name,
    professional_title: data.professional_title,
    email: data.email,
    phone: data.phone,
    location: data.location,
    linkedin_url: data.linkedin_url,
    github_url: data.github_url,
    links: data.links ?? [],
    summary: data.summary,
    experience: data.experience,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    certifications: data.certifications,
    languages: data.languages,
    awards: data.awards,
    preferred_template_id: selectedTemplateId,
    accent_color: accent,
  };
}

function patchFromCvDataWithJobMeta(
  data: CVData,
  selectedTemplateId: string,
  accent: string,
  jobTitle: string | null | undefined,
  companyName: string | null | undefined
) {
  return {
    ...patchFromCvData(data, selectedTemplateId, accent),
    job_title: jobTitle ?? null,
    company_name: companyName ?? null,
  };
}

/** Payload for PATCH /api/cv (core profile), matching core editor save. */
function atsLabel(score: number): string {
  if (score >= 85) return 'Interview Ready';
  if (score >= 65) return 'Strong';
  return 'Beginner';
}

function coreCvPatchFromDraft(data: CVData, preferredTemplateId: string) {
  return {
    full_name: data.full_name,
    professional_title: data.professional_title,
    email: data.email,
    phone: data.phone,
    location: data.location,
    linkedin_url: data.linkedin_url,
    github_url: data.github_url,
    links: data.links ?? [],
    address: data.address,
    photo_url: data.photo_url || null,
    summary: data.summary,
    original_cv_file_url: null,
    section_visibility: data.section_visibility ?? {},
    experience: data.experience,
    education: data.education,
    skills: data.skills,
    projects: data.projects,
    languages: data.languages,
    certifications: data.certifications,
    referrals: (data.referrals ?? []).slice(0, 2),
    awards: data.awards,
    preferred_cv_template_id: preferredTemplateId,
  };
}

export default function JobCVEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: jobCV, isLoading } = useJobSpecificCV(id);
  const { update, saveImmediately, isSaving, lastSaved } = useUpdateJobSpecificCV(id);
  const archive = useArchiveJobSpecificCV();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();
  const [showJD, setShowJD] = useState(false);
  const [atsKeywordsOpen, setAtsKeywordsOpen] = useState(false);

  const { tier } = useSubscription();
  const { toast } = useToast();

  const [draft, setDraft] = useState<CVData | null>(null);
  const draftRef = useRef<CVData | null>(null);
  draftRef.current = draft;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState<string>('#6C63FF');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorTab, setEditorTab] = useState<CVFormTab>('header');
  const [rightTab, setRightTab] = useState<'preview' | 'design'>('preview');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [prevAtsScore, setPrevAtsScore] = useState(0);
  const [targetCoreCvId, setTargetCoreCvId] = useState<string | null>(null);
  const [savingCore, setSavingCore] = useState(false);

  const [undoPast, setUndoPast] = useState<CVData[]>([]);
  const [undoFuture, setUndoFuture] = useState<CVData[]>([]);
  const burstStartRef = useRef<CVData | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHistoryRef = useRef(false);
  const allowUndoHistoryRef = useRef(false);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['cv-templates'],
    queryFn: async (): Promise<CVTemplate[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('cv_templates')
        .select('*')
        .eq('type', 'cv')
        .order('sort_order');
      return (data ?? []) as CVTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const templateMeta = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );
  const allowed = useMemo(() => {
    if (!templateMeta) return false;
    return canUseTemplate(
      templateMeta.available_tiers as SubscriptionTier[],
      tier
    );
  }, [templateMeta, tier]);

  useEffect(() => {
    allowUndoHistoryRef.current = false;
    const t = window.setTimeout(() => {
      allowUndoHistoryRef.current = true;
    }, 900);
    return () => window.clearTimeout(t);
  }, [id, jobCV?.id]);

  useEffect(() => {
    setDraft(null);
  }, [id]);

  useEffect(() => {
    if (!jobCV || draft) return;
    setDraft({
      full_name: jobCV.full_name ?? null,
      professional_title: jobCV.professional_title ?? null,
      email: jobCV.email ?? null,
      phone: jobCV.phone ?? null,
      location: jobCV.location ?? null,
      linkedin_url: jobCV.linkedin_url ?? null,
      github_url: jobCV.github_url ?? null,
      links: jobCV.links ?? [],
      address: null,
      photo_url: null,
      summary: jobCV.summary ?? null,
      section_visibility: {},
      experience: jobCV.experience ?? [],
      education: jobCV.education ?? [],
      skills: jobCV.skills ?? [],
      projects: jobCV.projects ?? [],
      certifications: jobCV.certifications ?? [],
      languages: jobCV.languages ?? [],
      awards: jobCV.awards ?? [],
      referrals: [],
    });
    setSelectedTemplateId(jobCV.preferred_template_id ?? 'classic');
    setAccent(jobCV.accent_color ?? '#6C63FF');
    setUndoPast([]);
    setUndoFuture([]);
    burstStartRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCV]);

  const handleChange = useCallback(
    (data: CVData) => {
      setDraft((prev) => {
        if (prev && !skipHistoryRef.current && allowUndoHistoryRef.current) {
          if (burstStartRef.current === null) {
            burstStartRef.current = cloneCvData(prev);
          }
          if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
          historyDebounceRef.current = setTimeout(() => {
            const snapshot = burstStartRef.current;
            burstStartRef.current = null;
            if (snapshot) {
              setUndoPast((p) => [...p.slice(-49), snapshot]);
              setUndoFuture([]);
            }
          }, 550);
        }
        skipHistoryRef.current = false;
        update(
          patchFromCvDataWithJobMeta(
            data,
            selectedTemplateId,
            accent,
            jobCV?.job_title,
            jobCV?.company_name
          )
        );
        return data;
      });
    },
    [update, selectedTemplateId, accent, jobCV?.job_title, jobCV?.company_name]
  );

  const undo = useCallback(() => {
    setUndoPast((p) => {
      if (!p.length) return p;
      const snapshot = p[p.length - 1];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = draftRef.current;
      if (cur) setUndoFuture((f) => [cloneCvData(cur), ...f].slice(0, 50));
      const next = cloneCvData(snapshot);
      setDraft(next);
      update(
        patchFromCvDataWithJobMeta(
          next,
          selectedTemplateId,
          accent,
          jobCV?.job_title,
          jobCV?.company_name
        )
      );
      return p.slice(0, -1);
    });
  }, [update, selectedTemplateId, accent, jobCV?.job_title, jobCV?.company_name]);

  const redo = useCallback(() => {
    setUndoFuture((f) => {
      if (!f.length) return f;
      const nextSnap = f[0];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = draftRef.current;
      if (cur) setUndoPast((p) => [...p.slice(-49), cloneCvData(cur)]);
      const next = cloneCvData(nextSnap);
      setDraft(next);
      update(
        patchFromCvDataWithJobMeta(
          next,
          selectedTemplateId,
          accent,
          jobCV?.job_title,
          jobCV?.company_name
        )
      );
      return f.slice(1);
    });
  }, [update, selectedTemplateId, accent, jobCV?.job_title, jobCV?.company_name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const refreshPreview = useCallback(async () => {
    if (!draft || !selectedTemplateId) return;
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          job_cv_id: id,
          template_id: selectedTemplateId,
          accent_color: accent,
          cv_snapshot: previewPayloadFromCVData(draft),
        }),
      });
      if (!res.ok) {
        setPreviewPdfUrl('');
        return;
      }
      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } finally {
      setPreviewBusy(false);
    }
  }, [draft, selectedTemplateId, accent, id]);

  useEffect(() => {
    if (!draft || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 700);
    return () => window.clearTimeout(t);
  }, [draft, refreshPreview, templatesLoading]);

  useEffect(() => {
    return () => {
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, []);

  useEffect(() => {
    if (!draft) return;
    setAutosaveState('saving');
    const t = window.setTimeout(() => setAutosaveState('saved'), 500);
    return () => window.clearTimeout(t);
  }, [draft]);

  const exportPdf = useCallback(async () => {
    if (!draft || !selectedTemplateId) return;
    if (!allowed) {
      toast('Upgrade to export with this template.', 'error');
      return;
    }
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          job_cv_id: id,
          template_id: selectedTemplateId,
          accent_color: accent,
          cv_snapshot: previewPayloadFromCVData(draft),
        }),
      });
      if (!res.ok) {
        if (res.status === 422) {
          toast('Add your name and at least one role to export.', 'error');
        } else {
          toast('Export failed.', 'error');
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } finally {
      setExporting(false);
    }
  }, [accent, allowed, draft, id, selectedTemplateId, toast]);

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    if (templates.some((t) => t.id === selectedTemplateId)) return;
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId]);

  useEffect(() => {
    if (!coreVersions.length) {
      setTargetCoreCvId(null);
      return;
    }
    setTargetCoreCvId((prev) =>
      prev && coreVersions.some((v) => v.id === prev) ? prev : coreVersions[0].id
    );
  }, [coreVersions]);

  const saveJobCv = useCallback(async () => {
    if (!draft) return;
    try {
      await saveImmediately(
        patchFromCvDataWithJobMeta(
          draft,
          selectedTemplateId,
          accent,
          jobCV?.job_title ?? '',
          jobCV?.company_name ?? null
        )
      );
      toast('Job CV saved.', 'success');
    } catch {
      toast('Could not save job CV.', 'error');
    }
  }, [draft, saveImmediately, selectedTemplateId, accent, toast, jobCV]);

  const updateCoreCvFromJob = useCallback(async () => {
    if (!draft || !targetCoreCvId) {
      toast('Select a core CV.', 'error');
      return;
    }
    setSavingCore(true);
    try {
      const res = await fetch('/api/cv', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          core_cv_id: targetCoreCvId,
          ...coreCvPatchFromDraft(draft, selectedTemplateId),
        }),
      });
      if (!res.ok) {
        toast('Could not update core CV.', 'error');
        return;
      }
      toast('Core CV updated. This job CV was not changed.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
      void queryClient.invalidateQueries({ queryKey: ['cv-profile'] });
    } finally {
      setSavingCore(false);
    }
  }, [draft, targetCoreCvId, selectedTemplateId, toast, queryClient]);

  const deleteJobCv = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Delete this job-specific CV?')) return;
    try {
      await archive.mutateAsync(id);
      toast('Job CV deleted.', 'success');
      router.push('/cv/job-specific');
    } catch {
      toast('Could not delete job CV.', 'error');
    }
  }, [id, archive, toast, router]);

  const keywords = jobCV?.keywords_added ?? [];
  const ats = draft
    ? buildATSReport(draft, keywords)
    : { score: 0, summary: '', suggestions: [], sections: {} };

  const keywordMatchedCount = useMemo(() => {
    if (!draft || !keywords.length) return 0;
    return keywords.filter((k) => isKeywordPresentInCv(k, draft)).length;
  }, [keywords, draft]);

  useEffect(() => {
    setPrevAtsScore((prev) => (ats.score === prev ? prev : ats.score));
  }, [ats.score]);

  if (isLoading || !draft || !jobCV) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  const saveLabel =
    isSaving || autosaveState === 'saving'
      ? 'Saving…'
      : lastSaved || autosaveState === 'saved'
        ? `Saved ${lastSaved ? lastSaved.toLocaleTimeString() : '✓'}`
        : '';

  return (
    <div className="mx-auto max-w-[1650px] space-y-4">
      <div className={CV_SHELL_HEADER}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/cv/job-specific"
              className="inline-flex text-sm font-medium text-[var(--color-primary)] transition hover:text-[var(--color-primary-400)]"
            >
              ← All Job CVs
            </Link>
            <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Edit job CV</h1>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)]">
              {jobCV.job_title || 'Target Role'}
              {jobCV.company_name ? ` at ${jobCV.company_name}` : ''}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Same editor as your core CV — live ATS feedback, preview, and undo.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={!undoPast.length}
                onClick={undo}
                icon={<Undo2 className="h-4 w-4" />}
                title="Undo (⌘Z)"
              >
                Undo
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!undoFuture.length}
                onClick={redo}
                icon={<Redo2 className="h-4 w-4" />}
                title="Redo (⌘⇧Z)"
              >
                Redo
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isSaving}
                onClick={() => void saveJobCv()}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={exporting}
                disabled={!allowed}
                onClick={() => void exportPdf()}
              >
                Export PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={archive.isPending}
                className="border-[var(--color-accent-coral)]/40 text-[var(--color-accent-coral)] hover:bg-[var(--color-accent-coral)]/10"
                onClick={() => void deleteJobCv()}
              >
                Delete
              </Button>
              <span className="text-xs text-[var(--color-muted)]">{saveLabel}</span>
            </div>
            <div className="flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 backdrop-blur-sm sm:max-w-md sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Select
                  label="Core CV version"
                  value={targetCoreCvId ?? ''}
                  disabled={coreVersionsLoading || coreVersions.length === 0}
                  options={
                    coreVersions.length
                      ? coreVersions.map((v) => ({
                          value: v.id,
                          label: `${v.full_name ?? 'Core CV'} · ${formatDate(v.created_at)}`,
                        }))
                      : [{ value: '', label: coreVersionsLoading ? 'Loading…' : 'No core CV yet' }]
                  }
                  onChange={(e) => setTargetCoreCvId(e.target.value || null)}
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 sm:mb-0.5"
                loading={savingCore}
                disabled={!draft || !targetCoreCvId || !coreVersions.length}
                onClick={() => void updateCoreCvFromJob()}
                title="Apply this editor content to the selected core CV. Does not modify this job CV."
              >
                Update core CV
              </Button>
            </div>
            <p className="max-w-md text-right text-[10px] leading-snug text-[var(--color-muted)] sm:self-end">
              Update core CV copies your current fields into the profile you pick. This job-specific CV stays as-is until
              you use Save.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5"
          onClick={() => setShowJD((v) => !v)}
          aria-expanded={showJD}
        >
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Job description</span>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {showJD ? 'Full job description' : 'Expand to view full job description'}
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--color-muted)]">
            {showJD ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </span>
        </button>
        {showJD ? (
          <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-4 font-mono text-xs leading-relaxed text-[var(--color-text-primary)] shadow-inner">
              {jobCV.job_description || 'No job description provided.'}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)]/90 shadow-sm backdrop-blur-sm">
        <button
          type="button"
          className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left sm:p-5"
          onClick={() => setAtsKeywordsOpen((v) => !v)}
          aria-expanded={atsKeywordsOpen}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">ATS &amp; keywords</span>
            <span className="font-mono text-xl font-bold tabular-nums text-[var(--color-text-primary)]">{ats.score}/100</span>
            <span className="rounded-badge border border-[var(--color-border)] bg-white/[0.06] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
              {atsLabel(ats.score)}
            </span>
            {keywords.length > 0 ? (
              <span className="text-sm text-[var(--color-muted)]">
                <span className="font-semibold font-mono text-[var(--color-accent-mint)]">{keywordMatchedCount}</span>
                <span> / {keywords.length}</span>
                <span> role keywords in CV</span>
              </span>
            ) : (
              <span className="text-sm text-[var(--color-muted)]">No role keywords for this job</span>
            )}
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-[var(--color-muted)]">
            {atsKeywordsOpen ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
          </span>
        </button>
        {atsKeywordsOpen ? (
          <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
            <ATSIndicator
              embedded
              score={ats.score}
              previousScore={prevAtsScore}
              suggestions={ats.suggestions}
            />
            {keywords.length > 0 ? (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <JobKeywordsBanner embedded keywords={keywords} cv={draft} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_420px]">
        <Sidebar activeSection={editorTab} onSelect={setEditorTab} />
        <div className="space-y-3">
          <div className={CV_FORM_CARD}>
            <CVEditorPanel
              value={draft}
              onChange={handleChange}
              activeTab={editorTab}
              onActiveTabChange={setEditorTab}
              highlightedKeywords={keywords}
              hideAtsBanner
              hideFormTabBar
              hideKeywordsBanner={keywords.length > 0}
            />
          </div>
        </div>
        <div className="space-y-3">
          <PreviewPanel
            activeTab={rightTab}
            onTabChange={setRightTab}
            previewPdfUrl={previewPdfUrl}
            previewBusy={previewBusy}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={page}
            onPageChange={setPage}
            selectedTemplateId={selectedTemplateId}
            templates={templates}
            onTemplateChange={(nextId) => {
              setSelectedTemplateId(nextId);
              update({ preferred_template_id: nextId, accent_color: accent });
            }}
            accent={accent}
            onAccentChange={(c) => {
              setAccent(c);
              update({ accent_color: c, preferred_template_id: selectedTemplateId });
            }}
            fontFamily={fontFamily}
            onFontFamilyChange={setFontFamily}
          />
          {!templatesLoading && !allowed && templateMeta ? (
            <p className="rounded-xl border border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/10 px-3 py-2 text-sm text-[var(--color-accent-gold)]">
              You can preview this layout with your data here. Upgrade to export with this template.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
