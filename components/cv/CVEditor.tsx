'use client';

import { useEffect, useState, useCallback, useRef, useMemo, useDeferredValue } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';
import { useCVEditor } from '@/hooks/useCVEditor';
import { useCvAutosave } from '@/hooks/useCvAutosave';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { CVEditorTopBar } from '@/components/cv/premium/CVEditorTopBar';
import type { CVEditorFocusMode } from '@/components/cv/premium/CVEditorTopBar';
import { ATSDrawer } from '@/components/cv/premium/ATSDrawer';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVSectionVisibility } from '@/types';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { useToast } from '@/components/ui/toast';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { CV_EDITOR_CANVAS } from '@/lib/cv-editor-styles';
import { cloneCvData } from '@/lib/cv-clone';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { cn } from '@/lib/utils';
import { ALL_TEMPLATE_IDS, TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';
import { useCVDocumentStore } from '@/src/store/cvStore';

const PREVIEW_DEBOUNCE_MS = 1200;

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(d)) as Record<string, unknown>;
}

export function CVEditor() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routeId = typeof params?.id === 'string' ? params.id : undefined;
  const coreCvIdFromQuery = searchParams.get('core_cv_id');

  useEffect(() => {
    if (coreCvIdFromQuery) {
      router.replace(`/cv/edit/${encodeURIComponent(coreCvIdFromQuery)}`);
    }
  }, [coreCvIdFromQuery, router]);

  const {
    cv,
    cvId,
    isSaving,
    saveError,
    loadError,
    isLoading,
    isDirty,
    saveButtonLabel,
    handleSave,
    reloadFromServer,
  } = useCVEditor({ cvIdFromRoute: routeId });

  useCvAutosave({ cvId, isNew: cvId === null });

  const queryClient = useQueryClient();

  const [draftActive, setDraftActive] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => setDraftActive(Boolean(sessionStorage.getItem('cv_draft')));
    compute();
    const onUpdate = () => compute();
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
  }, []);

  const isNew = searchParams.get('new') === '1';

  useEffect(() => {
    if (isNew && typeof window !== 'undefined') {
      const emptyCv = createEmptyCVData('classic');
      sessionStorage.setItem('cv_draft', JSON.stringify(emptyCv));
      sessionStorage.setItem('cv_draft_force_overwrite', '0');
      window.dispatchEvent(new Event('cv_draft_updated'));
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNew]);

  const { toast } = useToast();
  const { tier } = useSubscription();

  const { cvData, selectedTemplateId, accent, fontFamily } = useCVDocumentStore(
    useShallow((s) => ({
      cvData: s.cvData,
      selectedTemplateId: s.preferred_template_id,
      accent: s.accent_color,
      fontFamily: s.font_family,
    }))
  );

  const setSelectedTemplateId = useCallback((id: string) => {
    const tid = normalizeTemplateId(id) as TemplateId;
    const cfg = TEMPLATE_CONFIGS[tid];
    const st = useCVDocumentStore.getState();
    st.setPreferredTemplateId(tid);
    st.setMeta({
      templateId: tid,
      sectionOrder: [...cfg.sectionOrder],
      layout: cfg.layout === 'two-column' ? 'two-column' : 'single-column',
      showPhoto: cfg.showPhoto,
    });
  }, []);

  const setAccent = useCallback((v: string) => {
    const st = useCVDocumentStore.getState();
    st.setAccentColor(v);
    st.setMeta({ colorScheme: v });
  }, []);

  const setFontFamilyCb = useCallback((v: string) => {
    const st = useCVDocumentStore.getState();
    st.setFontFamily(v);
    st.setMeta({ fontFamily: v });
  }, []);

  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewIsPdf, setPreviewIsPdf] = useState(true);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorTab, setEditorTab] = useState<CVFormTab>('photo');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [focusMode, setFocusMode] = useState<CVEditorFocusMode>('default');
  const [atsDrawerOpen, setAtsDrawerOpen] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [undoPast, setUndoPast] = useState<CVData[]>([]);
  const [undoFuture, setUndoFuture] = useState<CVData[]>([]);
  const burstStartRef = useRef<CVData | null>(null);
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipHistoryRef = useRef(false);
  const allowUndoHistoryRef = useRef(false);
  const cvDataRef = useRef<CVData | null>(null);
  cvDataRef.current = cvData ?? null;

  useEffect(() => {
    allowUndoHistoryRef.current = false;
    const t = window.setTimeout(() => {
      allowUndoHistoryRef.current = true;
    }, 900);
    return () => window.clearTimeout(t);
  }, [routeId, cvId]);

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

  const catalogTid = normalizeTemplateId(selectedTemplateId) as TemplateId;
  const templateMeta = templates.find((t) => t.id === catalogTid) ?? null;
  const allowed =
    !ALL_TEMPLATE_IDS.includes(catalogTid)
      ? false
      : templateMeta
        ? canUseTemplate(templateMeta.available_tiers as SubscriptionTier[], tier)
        : true;

  const handleChange = useCallback((data: CVData) => {
    useCVDocumentStore.setState((prevState) => {
      if (!skipHistoryRef.current && allowUndoHistoryRef.current && prevState.cvData) {
        if (burstStartRef.current === null) {
          burstStartRef.current = cloneCvData(prevState.cvData);
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
      return { cvData: data, isDirty: true };
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
      useCVDocumentStore.getState().setCvData(cloneCvData(snapshot));
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
      useCVDocumentStore.getState().setCvData(cloneCvData(next));
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
    const tid = normalizeTemplateId(selectedTemplateId) as TemplateId;
    if (ALL_TEMPLATE_IDS.includes(tid)) return;
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId, setSelectedTemplateId]);

  const refreshPreview = useCallback(async () => {
    const st = useCVDocumentStore.getState();
    const snapCv = st.cvData;
    const tid = st.preferred_template_id;
    const acc = st.accent_color;
    const ff = st.font_family;
    if (!tid || !snapCv) return;
    setPreviewBusy(true);
    try {
      const snapshot = previewPayloadFromCVData(snapCv);
      const pngRes = await fetch('/api/cv/preview-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_snapshot: snapshot,
          template_id: tid,
          accent_color: acc,
          font_family: ff,
        }),
      });
      if (pngRes.ok) {
        const data = (await pngRes.json()) as { png?: string };
        if (data.png) {
          setPreviewIsPdf(false);
          setPreviewSrc((prev) => {
            if (prev.startsWith('blob:')) {
              URL.revokeObjectURL(prev.split('#')[0]);
            }
            return `data:image/png;base64,${data.png}`;
          });
          return;
        }
      }

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          id: cvId ?? undefined,
          template_id: tid,
          accent_color: acc,
          font_family: ff,
          cv_snapshot: snapshot,
        }),
      });
      if (!res.ok) {
        setPreviewSrc('');
        return;
      }
      const blob = await res.blob();
      const rawUrl = URL.createObjectURL(blob);
      const decoratedUrl = `${rawUrl}#toolbar=0&navpanes=0&scrollbar=0`;
      setPreviewIsPdf(true);
      setPreviewSrc((prev) => {
        if (prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev.split('#')[0]);
        }
        return decoratedUrl;
      });
    } finally {
      setPreviewBusy(false);
    }
  }, [cvId]);

  useEffect(() => {
    if (!selectedTemplateId || !cvData || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [selectedTemplateId, cvData, templatesLoading, refreshPreview, accent, fontFamily]);

  useEffect(() => {
    return () => {
      setPreviewSrc((prev) => {
        if (prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev.split('#')[0]);
        }
        return '';
      });
    };
  }, []);

  async function setPreferredTemplate() {
    if (!cvId || !selectedTemplateId) {
      toast('Save your CV first to set a default template.', 'error');
      return;
    }
    if (draftActive) {
      toast('Press Save first to persist your core CV.', 'error');
      return;
    }
    setSettingDefault(true);
    try {
      const res = await fetch(`/api/cvs/${cvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_template_id: selectedTemplateId }),
      });
      if (!res.ok) throw new Error('update_failed');
      toast('Default template updated.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
      void reloadFromServer();
    } catch {
      toast('Could not update template.', 'error');
    } finally {
      setSettingDefault(false);
    }
  }

  async function onSaveClick() {
    await handleSave();
    void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
  }

  async function exportPdf() {
    const st = useCVDocumentStore.getState();
    const d = st.cvData;
    const tid = st.preferred_template_id;
    if (!d || !tid) return;
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
          id: cvId ?? undefined,
          template_id: tid,
          accent_color: st.accent_color,
          font_family: st.font_family,
          cv_snapshot: previewPayloadFromCVData(d),
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

  const deferredSidebarCv = useDeferredValue(cvData);
  const deferredAtsCv = useDeferredValue(cvData);

  const ats = useMemo(
    () =>
      deferredAtsCv
        ? buildATSReport(deferredAtsCv)
        : { score: 0, summary: '', suggestions: [], sections: {} },
    [deferredAtsCv]
  );

  const subtitleName = cvData?.personal?.fullName?.trim();
  const docSaving = useCVDocumentStore((s) => s.isSaving);
  const statusBits: string[] = [];
  if (isDirty) statusBits.push('Unsaved changes');
  else if (cvId) {
    if (docSaving) statusBits.push('Saving…');
    else statusBits.push('Saved ✓');
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
        <p className="font-medium">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => void reloadFromServer()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !cvData) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="cv-editor-text-tune mx-auto max-w-[1800px] pb-8">
      <CVEditorTopBar
        backHref="/cv"
        title="Core CV"
        subtitle={subtitleName || 'Add your name in Header'}
        badge={
          isDirty ? (
            <span className="rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Draft
            </span>
          ) : null
        }
        atsScore={ats.score}
        onOpenAts={() => setAtsDrawerOpen(true)}
        undoRedo={{
          canUndo: undoPast.length > 0,
          canRedo: undoFuture.length > 0,
          onUndo: undo,
          onRedo: redo,
        }}
        secondaryAction={{
          label: 'Export PDF',
          loading: exporting,
          disabled: !allowed,
          onClick: () => void exportPdf(),
        }}
        primaryAction={{
          label: saveButtonLabel,
          loading: isSaving,
          disabled: isSaving,
          onClick: () => void onSaveClick(),
        }}
        statusLine={
          <>
            {statusBits.join(' · ')}
            {saveError ? <span className="text-red-600"> · {saveError}</span> : null}
          </>
        }
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
      />

      <ATSDrawer open={atsDrawerOpen} onOpenChange={setAtsDrawerOpen} report={ats} />

      <div
        className={cn(
          'mt-4 grid gap-4 px-1 sm:px-0',
          focusMode === 'default' &&
            'xl:grid-cols-[minmax(220px,0.24fr)_minmax(0,1fr)_minmax(390px,0.45fr)]',
          (focusMode === 'editor' || focusMode === 'preview') && 'xl:grid-cols-1'
        )}
      >
        {focusMode !== 'preview' ? (
          focusMode === 'default' ? (
            <Sidebar
              activeSection={editorTab}
              onSelect={setEditorTab}
              cvData={deferredSidebarCv ?? undefined}
              sectionVisibility={cvData.sectionVisibility}
              onSectionVisibilityChange={(next: CVSectionVisibility) =>
                handleChange({ ...cvData, sectionVisibility: next })
              }
            />
          ) : null
        ) : null}

        {focusMode !== 'preview' ? (
          <div
            className={cn(
              'min-w-0 space-y-3',
              focusMode === 'default' && 'xl:border-r xl:border-[var(--color-border)] xl:pr-3'
            )}
          >
            <div className={CV_EDITOR_CANVAS}>
              <CVEditorPanel
                useDocumentStore
                activeTab={editorTab}
                onActiveTabChange={setEditorTab}
                hideAtsBanner
                hideFormTabBar
                hideVisibilityPanel
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
                accent={accent}
                onAccentChange={setAccent}
                fontFamily={fontFamily}
                onFontFamilyChange={setFontFamilyCb}
                userTier={tier}
              />
            </div>
          </div>
        ) : null}

        {focusMode !== 'editor' ? (
          <div className="min-w-0 space-y-3">
            <PreviewPanel
              previewSrc={previewSrc}
              previewIsPdf={previewIsPdf}
              previewBusy={previewBusy}
              zoom={zoom}
              onZoomChange={setZoom}
              currentPage={page}
              onPageChange={setPage}
              collapsed={previewCollapsed}
              onToggleCollapse={() => setPreviewCollapsed((c) => !c)}
            />
            <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
              <p className="text-xs text-[var(--color-muted)]">Pro settings unlocked</p>
            </FeatureGate>
          </div>
        ) : null}
      </div>
    </div>
  );
}
