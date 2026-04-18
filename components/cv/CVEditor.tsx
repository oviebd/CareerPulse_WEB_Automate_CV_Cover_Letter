'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useCVEditor } from '@/hooks/useCVEditor';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { ATSCircularScore } from '@/components/cv/premium/ATSCircularScore';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVSectionVisibility } from '@/types';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { useToast } from '@/components/ui/toast';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { CV_FORM_CARD, CV_SHELL_HEADER } from '@/lib/cv-editor-styles';
import { cloneCvData } from '@/lib/cv-clone';
import { Undo2, Redo2 } from 'lucide-react';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { ALL_TEMPLATE_IDS, TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

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
    editorState,
    setEditorState,
    reloadFromServer,
  } = useCVEditor({ cvIdFromRoute: routeId });

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

  const cvData = editorState.cvData;
  const selectedTemplateId = editorState.preferred_template_id;
  const accent = editorState.accent_color;
  const fontFamily = editorState.font_family;

  const setSelectedTemplateId = useCallback(
    (id: string) => {
      setEditorState((prev) => {
        const tid = normalizeTemplateId(id) as TemplateId;
        const cfg = TEMPLATE_CONFIGS[tid];
        return {
          ...prev,
          preferred_template_id: tid,
          cvData: {
            ...prev.cvData,
            meta: {
              ...prev.cvData.meta,
              templateId: tid,
              sectionOrder: [...cfg.sectionOrder],
              layout: cfg.layout === 'two-column' ? 'two-column' : 'single-column',
              showPhoto: cfg.showPhoto,
            },
          },
        };
      });
    },
    [setEditorState]
  );

  const setAccent = useCallback(
    (v: string) => {
      setEditorState((prev) => ({
        ...prev,
        accent_color: v,
        cvData: {
          ...prev.cvData,
          meta: { ...prev.cvData.meta, colorScheme: v },
        },
      }));
    },
    [setEditorState]
  );

  const setFontFamily = useCallback(
    (v: string) => {
      setEditorState((prev) => ({
        ...prev,
        font_family: v,
        cvData: {
          ...prev.cvData,
          meta: { ...prev.cvData.meta, fontFamily: v },
        },
      }));
    },
    [setEditorState]
  );

  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewIsPdf, setPreviewIsPdf] = useState(true);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorTab, setEditorTab] = useState<CVFormTab>('photo');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
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
  /** DB row may be missing for some unified ids; export still uses `src/templates/{id}` via `exportCV`. */
  const allowed =
    !ALL_TEMPLATE_IDS.includes(catalogTid)
      ? false
      : templateMeta
        ? canUseTemplate(templateMeta.available_tiers as SubscriptionTier[], tier)
        : true;

  const handleChange = useCallback(
    (data: CVData) => {
      setEditorState((prev) => {
        if (!skipHistoryRef.current && allowUndoHistoryRef.current) {
          if (burstStartRef.current === null) {
            burstStartRef.current = cloneCvData(prev.cvData);
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
        return { ...prev, cvData: data };
      });
    },
    [setEditorState]
  );

  const undo = useCallback(() => {
    setUndoPast((p) => {
      if (!p.length) return p;
      const snapshot = p[p.length - 1];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = cvDataRef.current;
      if (cur) setUndoFuture((f) => [cloneCvData(cur), ...f].slice(0, 50));
      setEditorState((prev) => ({ ...prev, cvData: cloneCvData(snapshot) }));
      return p.slice(0, -1);
    });
  }, [setEditorState]);

  const redo = useCallback(() => {
    setUndoFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      skipHistoryRef.current = true;
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
      burstStartRef.current = null;
      const cur = cvDataRef.current;
      if (cur) setUndoPast((p) => [...p.slice(-49), cloneCvData(cur)]);
      setEditorState((prev) => ({ ...prev, cvData: cloneCvData(next) }));
      return f.slice(1);
    });
  }, [setEditorState]);

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

  /** Keep selection when the unified id exists on disk (`src/templates/{id}`); DB may only list a subset of rows. */
  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    const tid = normalizeTemplateId(selectedTemplateId) as TemplateId;
    if (ALL_TEMPLATE_IDS.includes(tid)) return;
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId, setSelectedTemplateId]);

  const refreshPreview = useCallback(async () => {
    if (!selectedTemplateId || !cvData) return;
    setPreviewBusy(true);
    try {
      const snapshot = previewPayloadFromCVData(cvData);
      const pngRes = await fetch('/api/cv/preview-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_snapshot: snapshot,
          template_id: selectedTemplateId,
          accent_color: accent,
          font_family: fontFamily,
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
          template_id: selectedTemplateId,
          accent_color: accent,
          font_family: fontFamily,
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
  }, [selectedTemplateId, cvData, accent, cvId, fontFamily]);

  useEffect(() => {
    if (!selectedTemplateId || !cvData || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 500);
    return () => window.clearTimeout(t);
  }, [selectedTemplateId, cvData, templatesLoading, refreshPreview]);

  useEffect(() => {
    if (!cvData) return;
    setAutosaveState('saving');
    const tm = window.setTimeout(() => setAutosaveState('saved'), 500);
    return () => window.clearTimeout(tm);
  }, [cvData]);

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
          id: cvId ?? undefined,
          template_id: selectedTemplateId,
          accent_color: accent,
          font_family: fontFamily,
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

  if (isLoading) {
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
            {isDirty ? (
              <p className="mt-1 text-xs text-amber-700/90">Unsaved changes</p>
            ) : null}
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
              loading={isSaving}
              disabled={isSaving}
              onClick={() => void onSaveClick()}
            >
              {saveButtonLabel}
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
              {!isDirty && (autosaveState === 'saved' || autosaveState === 'saving')
                ? 'Saved ✓'
                : autosaveState === 'saving'
                  ? 'Saving…'
                  : ''}
            </span>
            {saveError ? <span className="text-xs text-red-600">{saveError}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_630px]">
        <div className="min-w-0">
          <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
            <Sidebar
              activeSection={editorTab}
              onSelect={setEditorTab}
              cvData={cvData}
              sectionVisibility={cvData.sectionVisibility}
              onSectionVisibilityChange={(next: CVSectionVisibility) =>
                handleChange({ ...cvData, sectionVisibility: next })
              }
            />
            <div className="space-y-3">
              <div className="space-y-3">
                <div className={CV_FORM_CARD}>
                  <CVEditorPanel
                    value={cvData}
                    onChange={handleChange}
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
                    onFontFamilyChange={setFontFamily}
                    userTier={tier}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 xl:sticky xl:top-24">
          <ATSCircularScore score={ats.score} suggestions={ats.suggestions} />
          <PreviewPanel
            previewSrc={previewSrc}
            previewIsPdf={previewIsPdf}
            previewBusy={previewBusy}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={page}
            onPageChange={setPage}
          />
          <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
            <p className="text-xs text-[var(--color-muted)]">Pro settings unlocked</p>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
}
