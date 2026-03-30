'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { ATSIndicator } from '@/components/cv/premium/ATSIndicator';
import { JobKeywordsBanner } from '@/components/cv/premium/JobKeywordsBanner';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import {
  useJobSpecificCV,
  useUpdateJobSpecificCV,
} from '@/hooks/useJobSpecificCVs';
import { useSubscription } from '@/hooks/useSubscription';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { cloneCvData } from '@/lib/cv-clone';
import { useToast } from '@/components/ui/toast';
import { Undo2, Redo2, ChevronDown, ChevronUp } from 'lucide-react';

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return {
    full_name: d.full_name,
    professional_title: d.professional_title,
    email: d.email,
    phone: d.phone,
    location: d.location,
    linkedin_url: d.linkedin_url,
    portfolio_url: d.portfolio_url,
    website_url: d.website_url,
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
    portfolio_url: data.portfolio_url,
    website_url: data.website_url,
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

export default function JobCVEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: jobCV, isLoading } = useJobSpecificCV(id);
  const { update, isSaving, lastSaved } = useUpdateJobSpecificCV(id);
  const [showJD, setShowJD] = useState(false);

  const { tier } = useSubscription();
  const { toast } = useToast();

  const [draft, setDraft] = useState<CVData | null>(null);
  const draftRef = useRef<CVData | null>(null);
  draftRef.current = draft;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState<string>('#2563EB');
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
      portfolio_url: jobCV.portfolio_url ?? null,
      website_url: jobCV.website_url ?? null,
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
        update(patchFromCvData(data, selectedTemplateId, accent));
        return data;
      });
    },
    [update, selectedTemplateId, accent]
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
      update(patchFromCvData(next, selectedTemplateId, accent));
      return p.slice(0, -1);
    });
  }, [update, selectedTemplateId, accent]);

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
      update(patchFromCvData(next, selectedTemplateId, accent));
      return f.slice(1);
    });
  }, [update, selectedTemplateId, accent]);

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

  const keywords = jobCV?.keywords_added ?? [];
  const ats = draft
    ? buildATSReport(draft, keywords)
    : { score: 0, summary: '', suggestions: [], sections: {} };

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
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 to-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job-tailored CV</p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
              {jobCV.job_title}
              {jobCV.company_name ? (
                <span className="font-semibold text-slate-600"> · {jobCV.company_name}</span>
              ) : null}
            </h2>
            {jobCV.ai_changes_summary ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{jobCV.ai_changes_summary}</p>
            ) : null}
            <Link
              href="/cv/job-specific"
              className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              ← All Job CVs
            </Link>
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            onClick={() => setShowJD(!showJD)}
          >
            {showJD ? (
              <>
                Hide job description <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                View job description <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
        {showJD ? (
          <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-700 shadow-inner">
            {jobCV.job_description}
          </pre>
        ) : null}
      </div>

      <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Edit job CV</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Same editor as your core CV — live ATS feedback, preview, and undo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
              loading={exporting}
              disabled={!allowed}
              onClick={() => void exportPdf()}
            >
              Export PDF
            </Button>
            <span className="text-xs text-[var(--color-muted)]">{saveLabel}</span>
          </div>
        </div>
        <div className="mt-3">
          <ATSIndicator score={ats.score} previousScore={prevAtsScore} suggestions={ats.suggestions} />
        </div>
      </div>

      {keywords.length > 0 ? <JobKeywordsBanner keywords={keywords} cv={draft} /> : null}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_420px]">
        <Sidebar activeSection={editorTab} onSelect={setEditorTab} />
        <div className="space-y-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
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
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You can preview this layout with your data here. Upgrade to export with this template.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
