'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useCVEditor } from '@/hooks/useCVEditor';
import { useCVEditorPreviewState } from '@/hooks/useCVEditorPreviewState';
import { useAuthGate } from '@/hooks/useAuthGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useRequirePremium } from '@/hooks/useRequirePremium';
import { useCvTemplates } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { CVEditorTopBar } from '@/components/cv/premium/CVEditorTopBar';
import type { CVEditorFocusMode } from '@/components/cv/premium/CVEditorTopBar';
import { CVEditorShell } from '@/components/cv/premium/CVEditorShell';
import { ATSDrawer } from '@/components/cv/premium/ATSDrawer';
import { EmptyCVGuide, ExportReadyNudge } from '@/components/cv/EmptyCVGuide';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVSectionVisibility } from '@/types';
import { useToast } from '@/components/ui/toast';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate, canAccessFeature } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { CV_EDITOR_CANVAS } from '@/lib/cv-editor-styles';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { downloadCvExport, type ExportFormat } from '@/lib/export-client';
import { UnsavedLeaveModal } from '@/components/shared/UnsavedLeaveModal';
import { CvTitleModal } from '@/components/cv/CvTitleModal';
import { cloneCvData } from '@/lib/cv-clone';
import { cvCompletionPercent } from '@/lib/cv-sidebar-content';
import { ALL_TEMPLATE_IDS, TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { clearCvDraft } from '@/lib/cv-draft-storage';
import type { TemplateId } from '@/src/types/cv.types';
import { applyPreviewHtmlResponse, revokePreviewBlob } from '@/lib/preview-html-client';

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(d)) as Record<string, unknown>;
}

function buildSaveStatusLine({
  isDirty,
  isSaving,
  saveError,
  autosaveStatus,
}: {
  isDirty: boolean;
  isSaving: boolean;
  saveError: string | null;
  autosaveStatus: string;
}) {
  if (isSaving) return 'Saving…';
  if (saveError) return "Couldn't save";
  if (isDirty) return 'Unsaved changes';
  return 'Saved to account';
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
    cvId,
    isSaving,
    saveError,
    loadError,
    isLoading,
    isDirty,
    hasUnsavedWork,
    autosaveStatus,
    saveButtonLabel,
    flushAutosave,
    cancelAutosave,
    renameCv,
    editorState,
    setEditorState,
    reloadFromServer,
  } = useCVEditor({ cvIdFromRoute: routeId });

  const previewControl = useCVEditorPreviewState();
  const { requireAuth, authModal } = useAuthGate();
  const queryClient = useQueryClient();

  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);

  const { toast } = useToast();
  const { tier } = useSubscription();
  const { requirePremium, openGoPremium } = useRequirePremium();

  const cvData = editorState.cvData;
  const selectedTemplateId = editorState.preferred_template_id;
  const accent = editorState.accent_color;
  const fontFamily = editorState.font_family;
  const completionPct = useMemo(() => cvCompletionPercent(cvData), [cvData]);

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
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const previewHtmlRef = useRef<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [editorTab, setEditorTab] = useState<CVFormTab>('header');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [focusMode, setFocusMode] = useState<CVEditorFocusMode>('default');
  const [atsDrawerOpen, setAtsDrawerOpen] = useState(false);
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

  const { data: templates = [], isLoading: templatesLoading } = useCvTemplates();

  const catalogTid = normalizeTemplateId(selectedTemplateId) as TemplateId;
  const templateMeta = templates.find((t) => t.id === catalogTid) ?? null;
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

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    const tid = normalizeTemplateId(selectedTemplateId) as TemplateId;
    if (ALL_TEMPLATE_IDS.includes(tid)) return;
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId, setSelectedTemplateId]);

  const refreshPreview = useCallback(
    async (opts?: { showBusy?: boolean }) => {
      if (!selectedTemplateId || !cvData) return;
      const showBusy = opts?.showBusy !== false;
      if (showBusy) setPreviewBusy(true);
      try {
        const snapshot = previewPayloadFromCVData(cvData);
        const res = await fetch('/api/cv/preview-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_id: selectedTemplateId,
            accent_color: accent,
            cv: {
              ...snapshot,
              font_family: fontFamily,
              preferred_template_id: selectedTemplateId,
              accent_color: accent,
            },
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          setPreviewSrc('');
          previewHtmlRef.current = null;
          return;
        }
        const { url } = await applyPreviewHtmlResponse(text, {
          urlRef: previewUrlRef,
          htmlRef: previewHtmlRef,
        });
        if (url) setPreviewSrc(url);
      } finally {
        if (showBusy) setPreviewBusy(false);
      }
    },
    [selectedTemplateId, cvData, accent, fontFamily]
  );

  useEffect(() => {
    if (!selectedTemplateId || !cvData || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 500);
    return () => window.clearTimeout(t);
  }, [selectedTemplateId, cvData, templatesLoading, refreshPreview]);

  useEffect(() => {
    return () => {
      revokePreviewBlob({ urlRef: previewUrlRef, htmlRef: previewHtmlRef });
    };
  }, []);

  const handleBackClick = useCallback(() => {
    if (hasUnsavedWork) {
      setLeaveModalOpen(true);
      return;
    }
    router.push('/documents');
  }, [hasUnsavedWork, router]);

  const handleDiscardLeave = useCallback(() => {
    cancelAutosave();
    clearCvDraft();
    setLeaveModalOpen(false);
    router.push('/documents');
  }, [router, cancelAutosave]);

  const handleSaveAndLeave = useCallback(async () => {
    setLeaveSaving(true);
    try {
      const ok = await flushAutosave();
      if (ok) {
        setLeaveModalOpen(false);
        void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
        router.push('/documents');
      }
    } finally {
      setLeaveSaving(false);
    }
  }, [flushAutosave, queryClient, router]);

  async function performExport(format: ExportFormat = 'pdf') {
    if (!cvData || !selectedTemplateId) return;
    setExportingFormat(format);
    try {
      const result = await downloadCvExport(
        {
          id: cvId ?? undefined,
          template_id: selectedTemplateId,
          accent_color: accent,
          font_family: fontFamily,
          cv_snapshot: previewPayloadFromCVData(cvData),
        },
        format
      );
      if (result === 'upgrade_required') {
        openGoPremium(format === 'docx' ? 'docx' : 'export');
      } else if (result === 'error') {
        toast('Export failed.', 'error');
      }
    } finally {
      setExportingFormat(null);
    }
  }

  function runExport(format: ExportFormat = 'pdf') {
    if (!cvData || !selectedTemplateId) return;
    if (!allowed) {
      openGoPremium('template');
      return;
    }
    const needsPremium =
      format === 'docx'
        ? !canAccessFeature(tier, 'docxExport')
        : !canAccessFeature(tier, 'pdfExport');
    if (needsPremium) {
      requirePremium(format === 'docx' ? 'docx' : 'export', () => {
        void performExport(format);
      });
      return;
    }
    void performExport(format);
  }

  const ats = cvData
    ? buildATSReport(cvData)
    : { score: 0, summary: '', suggestions: [], sections: {} };

  const subtitleName = cvData?.personal?.fullName?.trim();
  const statusLine = buildSaveStatusLine({
    isDirty,
    isSaving,
    saveError,
    autosaveStatus,
  });

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
    <div className="cv-editor-text-tune mx-auto max-w-[1800px] pb-24 md:pb-8">
      {authModal}
      <UnsavedLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onDiscard={handleDiscardLeave}
        onSaveAndLeave={() => void handleSaveAndLeave()}
        saving={leaveSaving}
        entityLabel="CV"
      />
      <CvTitleModal
        isOpen={renameModalOpen}
        defaultTitle={editorState.name?.trim() || ''}
        onClose={() => setRenameModalOpen(false)}
        onConfirm={async (title) => {
          setRenameBusy(true);
          try {
            const ok = await renameCv(title);
            if (ok) {
              setRenameModalOpen(false);
              void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
              void queryClient.invalidateQueries({ queryKey: ['all-cvs'] });
            }
          } finally {
            setRenameBusy(false);
          }
        }}
        isSubmitting={renameBusy}
        submitLabel="Save name"
      />
      <CVEditorTopBar
        backHref="/documents"
        onBackClick={handleBackClick}
        title="Core CV"
        subtitle={editorState.name?.trim() || subtitleName || 'Master CV — reused for every application'}
        caption={
          cvId
            ? 'Library name · click Rename to change'
            : subtitleName
              ? 'Master CV — reused for every application'
              : undefined
        }
        bottomRow={
          cvId ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
              <span className="truncate font-medium text-[var(--color-text-secondary)]">
                {editorState.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setRenameModalOpen(true)}
              >
                Rename
              </Button>
            </div>
          ) : undefined
        }
        badge={
          hasUnsavedWork ? (
            <span className="rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Unsaved
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
        previewToggle={{
          visible: previewControl.isPreviewActive,
          onToggle: previewControl.togglePreview,
        }}
        primaryAction={{
          label: saveButtonLabel,
          loading: isSaving,
          disabled: isSaving && !isDirty,
          highlight: isDirty,
          onClick: requireAuth(() => {
            void flushAutosave().then((ok) => {
              if (ok) void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
            });
          }),
        }}
        statusLine={
          <>
            {statusLine}
            {saveError ? <span className="text-[var(--color-danger)]"> · {saveError}</span> : null}
          </>
        }
        onRetrySave={saveError ? () => void flushAutosave() : undefined}
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        trailingControls={
          <ExportMenu
            label="Export"
            busyFormat={exportingFormat}
            disabled={!cvData || !selectedTemplateId}
            canExport={canAccessFeature(tier, 'pdfExport')}
            canDocx={canAccessFeature(tier, 'docxExport')}
            onExport={(format) => {
              requireAuth(() => {
                void runExport(format);
              })();
            }}
          />
        }
      />

      <ATSDrawer open={atsDrawerOpen} onOpenChange={setAtsDrawerOpen} report={ats} />

      <CVEditorShell
        focusMode={focusMode}
        editorTab={editorTab}
        onEditorTabChange={setEditorTab}
        cvData={cvData}
        previewControl={previewControl}
        onSectionVisibilityChange={(next: CVSectionVisibility) =>
          handleChange({ ...cvData, sectionVisibility: next })
        }
        editorCanvas={
          <div className={CV_EDITOR_CANVAS}>
            <EmptyCVGuide cvData={cvData} activeTab={editorTab} onGoToSection={setEditorTab} placement="top" />
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
            <EmptyCVGuide cvData={cvData} activeTab={editorTab} onGoToSection={setEditorTab} placement="bottom" />
          </div>
        }
        preview={{
          previewSrc,
          previewBusy,
          zoom,
          onZoomChange: setZoom,
          currentPage: page,
          onPageChange: setPage,
          footerSlot: (
            <ExportReadyNudge
              completion={completionPct}
              busyFormat={exportingFormat}
              canExport={canAccessFeature(tier, 'pdfExport')}
              canDocx={canAccessFeature(tier, 'docxExport')}
              exportDisabled={!cvData || !selectedTemplateId}
              onExport={(format) => {
                requireAuth(() => {
                  void runExport(format);
                })();
              }}
            />
          ),
        }}
        mobileBar={{
          primaryLabel: saveButtonLabel,
          primaryLoading: isSaving,
          primaryDisabled: isSaving,
          onPrimaryClick: requireAuth(() => {
            void flushAutosave().then((ok) => {
              if (ok) void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
            });
          }),
        }}
      />
    </div>
  );
}
