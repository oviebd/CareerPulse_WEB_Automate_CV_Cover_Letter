'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCVProfile, useCoreCVVersions } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { ATSIndicator } from '@/components/cv/premium/ATSIndicator';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import { FeatureGate, TemplateGate } from '@/components/shared/FeatureGate';
import { useToast } from '@/components/ui/toast';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { formatDate } from '@/lib/utils';
import { CV_FORM_CARD, CV_SHELL_HEADER } from '@/lib/cv-editor-styles';
import { cloneCvData } from '@/lib/cv-clone';
import { useSearchParams } from 'next/navigation';
import { Undo2, Redo2 } from 'lucide-react';

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
    // Used by applyCvSectionVisibility() during HTML/PDF rendering.
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

export function CVEditor() {
  const queryClient = useQueryClient();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();
  const [selectedCoreCvId, setSelectedCoreCvId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const coreCvIdFromQuery = searchParams.get('core_cv_id');

  const { data: cv, isLoading, refetch } = useCVProfile(selectedCoreCvId);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [cvData, setCvData] = useState<CVData | null>(null);
  const initialized = useRef(false);

  const [draftActive, setDraftActive] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => setDraftActive(Boolean(sessionStorage.getItem('cv_draft')));
    compute();
    const onUpdate = () => compute();
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
  }, []);

  useEffect(() => {
    if (draftActive || isNew) return;
    if (!coreVersionsLoading && coreVersions.length > 0) {
      const latestId = coreVersions[0]?.id ?? null;
      const requestedId =
        coreCvIdFromQuery && coreVersions.some((v) => v.id === coreCvIdFromQuery)
          ? coreCvIdFromQuery
          : null;
      setSelectedCoreCvId((prev) => (prev ? prev : requestedId ?? latestId));
    }
  }, [coreVersionsLoading, coreVersions, draftActive, coreCvIdFromQuery]);

  const isNew = searchParams.get('new') === '1';

  useEffect(() => {
    if (isNew && typeof window !== 'undefined') {
      const emptyCv = {
        full_name: '',
        professional_title: '',
        email: '',
        phone: '',
        location: '',
        linkedin_url: '',
        github_url: '',
        links: [],
        address: '',
        photo_url: null,
        summary: '',
        section_visibility: {},
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        languages: [],
        awards: [],
        referrals: [],
      };
      sessionStorage.setItem('cv_draft', JSON.stringify(emptyCv));
      sessionStorage.setItem('cv_draft_force_overwrite', '0');
      window.dispatchEvent(new Event('cv_draft_updated'));

      // Clean up URL to avoid re-triggering on manual refresh if they've already started editing
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNew]);

  useEffect(() => {
    // Reset initialization when the user changes versions (or a draft appears).
    initialized.current = false;
  }, [selectedCoreCvId, draftActive]);

  const { toast } = useToast();
  const { tier } = useSubscription();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState('#6C63FF');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
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
  const cvDataRef = useRef<CVData | null>(null);
  cvDataRef.current = cvData;

  useEffect(() => {
    allowUndoHistoryRef.current = false;
    const t = window.setTimeout(() => {
      allowUndoHistoryRef.current = true;
    }, 900);
    return () => window.clearTimeout(t);
  }, [selectedCoreCvId, cv?.id]);

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

  const templateMeta = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const allowed = templateMeta
    ? canUseTemplate(templateMeta.available_tiers as SubscriptionTier[], tier)
    : false;

  useEffect(() => {
    if (!cv || initialized.current) return;
    initialized.current = true;
    setSelectedTemplateId(cv.preferred_cv_template_id ?? 'classic');
    setUndoPast([]);
    setUndoFuture([]);
    burstStartRef.current = null;
    setCvData({
      full_name: cv.full_name ?? null,
      professional_title: cv.professional_title ?? null,
      email: cv.email ?? null,
      phone: cv.phone ?? null,
      location: cv.location ?? null,
      linkedin_url: cv.linkedin_url ?? null,
      github_url: cv.github_url ?? null,
      links: cv.links ?? [],
      address: cv.address ?? null,
      photo_url: cv.photo_url ?? null,
      summary: cv.summary ?? null,
      section_visibility: cv.section_visibility ?? {},
      experience: cv.experience ?? [],
      education: cv.education ?? [],
      skills: cv.skills ?? [],
      projects: cv.projects ?? [],
      certifications: cv.certifications ?? [],
      languages: cv.languages ?? [],
      awards: cv.awards ?? [],
      referrals: cv.referrals ?? [],
    });
  }, [cv]);

  const handleChange = useCallback((data: CVData) => {
    setCvData((prev) => {
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
      return data;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoPast((p) => {
      if (!p.length) return p;
      const snapshot = p[p.length - 1];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = cvDataRef.current;
      if (cur) setUndoFuture((f) => [cloneCvData(cur), ...f].slice(0, 50));
      setCvData(cloneCvData(snapshot));
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setUndoFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = cvDataRef.current;
      if (cur) setUndoPast((p) => [...p.slice(-49), cloneCvData(cur)]);
      setCvData(cloneCvData(next));
      return f.slice(1);
    });
  }, []);

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

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    if (templates.some((t) => t.id === selectedTemplateId)) return;
    // Fallback if the saved preferred template was deleted/changed.
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId]);

  const refreshPreview = useCallback(async () => {
    if (!selectedTemplateId || !cvData) return;
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          id: cv?.id,
          template_id: selectedTemplateId,
          accent_color: accent,
          cv_snapshot: previewPayloadFromCVData(cvData),
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
  }, [selectedTemplateId, cvData, accent, cv?.id]);

  useEffect(() => {
    if (!selectedTemplateId || !cvData || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 700);
    return () => window.clearTimeout(t);
  }, [selectedTemplateId, cvData, templatesLoading, refreshPreview]);

  useEffect(() => {
    if (!cvData) return;
    setAutosaveState('saving');
    const t = window.setTimeout(() => setAutosaveState('saved'), 500);
    return () => window.clearTimeout(t);
  }, [cvData]);

  useEffect(() => {
    return () => {
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, []);

  async function setPreferredTemplate() {
    if (!cv || !selectedTemplateId) return;
    if (draftActive) {
      toast('Press Save first to persist your core CV.', 'error');
      return;
    }
    setSettingDefault(true);
    try {
      const supabase = createClient();
      await supabase
        .from('cv_profiles')
        .update({ preferred_cv_template_id: selectedTemplateId })
        .eq('id', cv.id);
      toast('Default template updated.', 'success');
      void refetch();
    } catch (e) {
      toast('Could not update template.', 'error');
    } finally {
      setSettingDefault(false);
    }
  }

  async function save() {
    if (!cvData) return;
    setSaveState('saving');

    const forceOverwrite =
      sessionStorage.getItem('cv_draft_force_overwrite') === '1';
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        core_cv_id: draftActive ? undefined : selectedCoreCvId,
        create_new: draftActive,
        force_overwrite_existing: forceOverwrite,
        preferred_cv_template_id: draftActive ? selectedTemplateId : undefined,
        full_name: cvData.full_name,
        professional_title: cvData.professional_title,
        email: cvData.email,
        phone: cvData.phone,
        location: cvData.location,
        linkedin_url: cvData.linkedin_url,
        github_url: cvData.github_url,
        links: cvData.links ?? [],
        address: cvData.address,
        photo_url: cvData.photo_url || null,
        summary: cvData.summary,
        // Ensure we never persist uploaded PDFs; we only keep extracted info.
        original_cv_file_url: null,
        section_visibility: cvData.section_visibility ?? {},
        experience: cvData.experience,
        education: cvData.education,
        skills: cvData.skills,
        projects: cvData.projects,
        languages: cvData.languages,
        certifications: cvData.certifications,
        referrals: (cvData.referrals ?? []).slice(0, 2),
        awards: cvData.awards,
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      // Persist has completed; draft is no longer needed.
      try {
        sessionStorage.removeItem('cv_draft');
        sessionStorage.removeItem('cv_draft_force_overwrite');
        window.dispatchEvent(new Event('cv_draft_updated'));
      } catch {
        // ignore
      }
      try {
        const json = (await res.json()) as { cvProfile?: { id?: string } };
        if (json.cvProfile?.id) setSelectedCoreCvId(json.cvProfile.id);
      } catch {
        // ignore
      }
      void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
    }
  }

  async function exportPdf() {
    if (!cvData || !selectedTemplateId) return;
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
          id: cv?.id,
          template_id: selectedTemplateId,
          accent_color: accent,
          cv_snapshot: previewPayloadFromCVData(cvData),
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
  }

  const ats = cvData
    ? buildATSReport(cvData)
    : { score: 0, summary: '', suggestions: [], sections: {} };
  useEffect(() => {
    setPrevAtsScore((prev) => (ats.score === prev ? prev : ats.score));
  }, [ats.score]);

  if (isLoading || !cvData) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-[1650px] space-y-4">
      <div className={CV_SHELL_HEADER}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Edit CV</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Editor-first CV writing with live ATS feedback and preview.
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
            loading={saveState === 'saving'}
            onClick={() => void save()}
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
          <span className="text-xs text-[var(--color-muted)]">
            {saveState === 'saved' || autosaveState === 'saved' ? 'Saved ✓' : autosaveState === 'saving' ? 'Saving…' : ''}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <ATSIndicator score={ats.score} previousScore={prevAtsScore} suggestions={ats.suggestions} />
      </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_420px]">
        <Sidebar activeSection={editorTab} onSelect={setEditorTab} />
        <div className="space-y-3">
          <div className={CV_FORM_CARD}>
            <CVEditorPanel
              value={cvData}
              onChange={handleChange}
              activeTab={editorTab}
              onActiveTabChange={setEditorTab}
              hideAtsBanner
              hideFormTabBar
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
            <span>Version: {selectedCoreCvId ? selectedCoreCvId.slice(0, 8) : 'draft'}</span>
            {draftActive ? (
              <span className="rounded-badge border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[var(--color-accent-gold)]">
                Draft mode
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <div className={CV_FORM_CARD}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Core CV version
            </p>
            <Select
              label={coreVersionsLoading ? 'Loading…' : 'Select saved core CV'}
              value={selectedCoreCvId ?? ''}
              disabled={draftActive || coreVersionsLoading || coreVersions.length === 0}
              options={coreVersions.map((v) => ({
                value: v.id,
                label: `${v.full_name ?? 'Core CV'} · ${formatDate(v.created_at)}`,
              }))}
              onChange={(e) => setSelectedCoreCvId(e.target.value)}
            />
            {draftActive ? (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                You have an upload draft. Press <strong>Save</strong> to create a new version.
              </p>
            ) : null}
          </div>
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
            onTemplateChange={setSelectedTemplateId}
            accent={accent}
            onAccentChange={setAccent}
            fontFamily={fontFamily}
            onFontFamilyChange={setFontFamily}
          />
          <TemplateGate availableTiers={(templateMeta?.available_tiers ?? []) as SubscriptionTier[]} userTier={tier}>
            <Button variant="secondary" size="sm" loading={settingDefault} disabled={!allowed || draftActive} onClick={() => void setPreferredTemplate()}>
              Set as default template
            </Button>
          </TemplateGate>
          <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
            <p className="text-xs text-[var(--color-muted)]">Pro settings unlocked</p>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
}
