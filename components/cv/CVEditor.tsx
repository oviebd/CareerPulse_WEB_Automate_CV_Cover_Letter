'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useCVEditor } from '@/hooks/useCVEditor';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGuestCvStore } from '@/stores/guestCvStore';
import { createCoreCvFromEditorState } from '@/lib/create-core-cv-from-editor-state';
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
    isGuest,
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

  const { requireAuth, authModal, openAuthModal } = useAuthGate(editorState);
  const authedUser = useAuthStore((s) => s.user);
  const autoGuestSyncRef = useRef(false);

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
    if (isGuest) return;
    if (isNew && typeof window !== 'undefined') {
      const emptyCv = createEmptyCVData('classic');
      sessionStorage.setItem('cv_draft', JSON.stringify(emptyCv));
      sessionStorage.setItem('cv_draft_force_overwrite', '0');
      window.dispatchEvent(new Event('cv_draft_updated'));
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
  }, [isNew, isGuest]);

  const { toast } = useToast();
  const { tier } = useSubscription();

  useEffect(() => {
    if (isGuest || !authedUser || routeId || autoGuestSyncRef.current) return;
    const pending = useGuestCvStore.getState().guestEditorState;
    if (!pending) return;
    autoGuestSyncRef.current = true;
    void (async () => {
      try {
        const created = await createCoreCvFromEditorState(pending);
        useGuestCvStore.getState().clearGuestCv();
        try {
          sessionStorage.removeItem('cv_draft');
          window.dispatchEvent(new Event('cv_draft_updated'));
        } catch {
          /* ignore */
        }
        await queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
        router.replace(`/cv/edit/${created.id}`);
      } catch (e) {
        autoGuestSyncRef.current = false;
        toast(e instanceof Error ? e.message : 'Could not save your CV', 'error');
      }
    })();
  }, [isGuest, authedUser, routeId, router, queryClient, toast]);

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
  const [focusMode, setFocusMode] = useState<CVEditorFocusMode>('default');
  const [atsDrawerOpen, setAtsDrawerOpen] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
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

  async function runExportPdf() {
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

  const subtitleName = cvData?.personal?.fullName?.trim();
  const statusBits: string[] = [];
  if (isDirty) statusBits.push('Unsaved changes');
  if (!isDirty && (autosaveState === 'saved' || autosaveState === 'saving')) {
    if (autosaveState === 'saving') statusBits.push('Saving…');
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

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="cv-editor-text-tune mx-auto max-w-[1800px] pb-8">
      {authModal}
      {isGuest ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-3 text-sm text-[var(--color-muted)] backdrop-blur-sm">
          <span>
            You&apos;re editing as a guest —{' '}
            <Link
              href="/register?returnTo=%2Fcv%2Fedit%3Fguest%3Dtrue&preserveGuestCv=true"
              className="font-medium text-[var(--color-primary-500)] hover:underline"
            >
              Sign up free
            </Link>{' '}
            to save your CV to the cloud.
          </span>
        </div>
      ) : null}
      <CVEditorTopBar
        backHref={isGuest ? '/' : '/cv'}
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
          disabled: !isGuest && !allowed,
          onClick: requireAuth(() => {
            void runExportPdf();
          }),
        }}
        primaryAction={{
          label: saveButtonLabel,
          loading: isSaving,
          disabled: isSaving,
          onClick: requireAuth(() => {
            void onSaveClick();
          }),
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
              cvData={cvData}
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
                onRequireAiAuth={isGuest ? openAuthModal : undefined}
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
