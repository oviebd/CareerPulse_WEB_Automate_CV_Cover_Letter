'use client';

/**
 * Layout history: legacy job editor stacked a tall header, separate core-CV sync panel, expandable keyword/JD tray,
 * and an always-visible ATS stack beside a fixed-width preview — shrinking the form. Refactor keeps ATS in a drawer,
 * keywords in a contextual popover, and a 3-column shell + focus modes. Master-CV copy controls were removed from
 * the toolbar so this page stays job-CV-only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { CVEditorTopBar } from '@/components/cv/premium/CVEditorTopBar';
import type { CVEditorFocusMode } from '@/components/cv/premium/CVEditorTopBar';
import { CVEditorShell } from '@/components/cv/premium/CVEditorShell';
import { CVEditorMobileBar } from '@/components/cv/premium/CVEditorMobileBar';
import { ATSDrawer } from '@/components/cv/premium/ATSDrawer';
import { KeywordPopover } from '@/components/cv/premium/KeywordPopover';
import { useCVEditorPreviewState } from '@/hooks/useCVEditorPreviewState';
import { useCVEditorAutosave } from '@/hooks/useCVEditorAutosave';
import { DEFAULT_CV_ACCENT } from '@/lib/cv-accent';
import { UnsavedLeaveModal } from '@/components/shared/UnsavedLeaveModal';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVSectionVisibility } from '@/types';
import { useJobSpecificCV, useArchiveJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useCoreCVVersions } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate, canAccessFeature } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { cloneCvData } from '@/lib/cv-clone';
import { useToast } from '@/components/ui/toast';
import { CV_EDITOR_CANVAS } from '@/lib/cv-editor-styles';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { downloadCvExport, type ExportFormat } from '@/lib/export-client';
import {
  parseOptimisedCvText,
  optimisedCvJsonToCvData,
  cvDataToOptimisedCvJson,
} from '@/lib/optimise-result';
import { profileToUniversalCV, universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { ALL_TEMPLATE_IDS, TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import type { GenerationType, JobStatus } from '@/types';
import { JOB_STATUS_CONFIG, jobStatusShortLabel } from '@/types';
import { TRACKABLE_JOB_STATUSES } from '@/lib/job-status';
import { computeCvDiffSections, summarizeDiff } from '@/lib/cv-diff';
import type { CVProfile } from '@/types';
import { CvTitleModal } from '@/components/cv/CvTitleModal';
import { defaultJobCvDisplayName } from '@/lib/cv-display-name';
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import {
  Loader2,
  GitCompareArrows,
  MapPin,
  Building2,
  AlertTriangle,
  ChevronDown,
  Briefcase,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  useOptimiseEditDraftStore,
  type CvOptimiseEditDraft,
} from '@/stores/useOptimiseEditDraftStore';

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return JSON.parse(JSON.stringify(d)) as Record<string, unknown>;
}

function withDesign(
  cv: CVData,
  templateId: string,
  accent: string,
  font: string
): CVData {
  const tid = normalizeTemplateId(templateId) as TemplateId;
  const cfg = TEMPLATE_CONFIGS[tid];
  return {
    ...cv,
    meta: {
      ...cv.meta,
      templateId: tid,
      colorScheme: accent,
      fontFamily: font,
      sectionOrder: [...cfg.sectionOrder],
      layout: cfg.layout === 'two-column' ? 'two-column' : 'single-column',
      showPhoto: cfg.showPhoto,
    },
  };
}

function patchFromCvData(
  data: CVData,
  selectedTemplateId: string,
  accent: string,
  fontFamily: string
) {
  return universalToProfilePayload(
    withDesign(data, selectedTemplateId, accent, fontFamily)
  );
}

function patchFromCvDataWithJobMeta(
  data: CVData,
  selectedTemplateId: string,
  accent: string,
  fontFamily: string,
  jobTitle: string | null | undefined,
  companyName: string | null | undefined
) {
  return {
    ...patchFromCvData(data, selectedTemplateId, accent, fontFamily),
    job_title: jobTitle ?? null,
    company_name: companyName ?? null,
  };
}

function cvProfileToCvData(profile: CVProfile): CVData {
  return profileToUniversalCV(profile);
}

const TRACK_STATUS_OPTIONS = TRACKABLE_JOB_STATUSES;

export function JobTailoredCVEditor() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const isDraftMode = id === 'draft';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: jobCV, isLoading: jobCvLoading } = useJobSpecificCV(
    isDraftMode ? undefined : id
  );
  const archive = useArchiveJobSpecificCV();
  const { data: coreVersions = [] } = useCoreCVVersions();
  const [keywordsPopoverOpen, setKeywordsPopoverOpen] = useState(false);
  const [atsDrawerOpen, setAtsDrawerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<CVEditorFocusMode>('default');
  const previewControl = useCVEditorPreviewState();

  const { tier } = useSubscription();
  const { toast } = useToast();

  const [draft, setDraft] = useState<CVData | null>(null);
  const draftRef = useRef<CVData | null>(null);
  draftRef.current = draft;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState<string>(DEFAULT_CV_ACCENT);
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [editorTab, setEditorTab] = useState<CVFormTab>('photo');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [saveError, setSaveError] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  const [draftMeta, setDraftMeta] = useState<CvOptimiseEditDraft | null>(null);
  const [sessionSavedJobId, setSessionSavedJobId] = useState<string | null>(null);
  const [sessionSavedCvId, setSessionSavedCvId] = useState<string | null>(null);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [documentTab, setDocumentTab] = useState<'cv' | 'coverLetter'>('cv');
  const [trackPopupOpen, setTrackPopupOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffSections, setDiffSections] = useState<
    ReturnType<typeof computeCvDiffSections>
  >([]);
  const [trackPopupSaving, setTrackPopupSaving] = useState(false);
  const [pageSaveState, setPageSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [titleModalDefault, setTitleModalDefault] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const leaveAfterSaveRef = useRef(false);
  const [uncollapsedDiffSections, setUncollapsedDiffSections] = useState<Record<string, boolean>>(
    {}
  );
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [pendingTrackStatus, setPendingTrackStatus] = useState<JobStatus | null>(null);

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

  const catalogTid = normalizeTemplateId(selectedTemplateId) as TemplateId;
  const templateMeta = useMemo(
    () => templates.find((t) => t.id === catalogTid) ?? null,
    [templates, catalogTid]
  );
  const allowed = useMemo(() => {
    if (!ALL_TEMPLATE_IDS.includes(catalogTid)) return false;
    if (!templateMeta) return true;
    return canUseTemplate(
      templateMeta.available_tiers as SubscriptionTier[],
      tier
    );
  }, [templateMeta, tier, catalogTid]);

  const jobTitle = jobCV?.job_title ?? draftMeta?.jobTitle ?? '';
  const companyName = jobCV?.company_name ?? draftMeta?.companyName ?? null;
  const keywords = jobCV?.keywords_added ?? draftMeta?.extractedKeywords ?? [];

  const genType: GenerationType = (() => {
    if (isDraftMode) {
      return draftMeta?.generationType ?? (coverLetterText.trim() ? 'both' : 'cv');
    }
    // Saved job CV: include cover letter when the editor has CL text
    if (coverLetterText.trim()) {
      const metaGen = draftMeta?.generationType;
      if (metaGen === 'coverLetter' || metaGen === 'both') return metaGen;
      return 'both';
    }
    return draftMeta?.generationType ?? 'cv';
  })();

  const effectiveJobId = isDraftMode
    ? sessionSavedJobId ?? draftMeta?.savedJobId ?? null
    : (jobCV as { job_ids?: string[] } | null | undefined)?.job_ids?.[0] ?? null;

  const { data: jobRow } = useQuery({
    queryKey: ['job-detail', effectiveJobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${effectiveJobId}`);
      if (!res.ok) throw new Error('job_fetch_failed');
      return res.json() as Promise<{ status: JobStatus }>;
    },
    enabled: Boolean(effectiveJobId),
    staleTime: 30_000,
  });

  const trackStatus: JobStatus | null = jobRow?.status ?? null;

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
    if (!isDraftMode) {
      setDraftMeta(null);
    }
  }, [isDraftMode, id]);

  useEffect(() => {
    if (!isDraftMode) return;
    const payload = useOptimiseEditDraftStore.getState().cvEditDraft;
    if (!payload?.cvContent?.trim()) {
      router.replace('/cv/optimise/result');
      return;
    }
    setDraftMeta(payload);
    setSessionSavedJobId(payload.savedJobId ?? null);
    setSessionSavedCvId(payload.savedCvId ?? null);
    setCoverLetterText(payload.coverLetter ?? '');
    const parsed = parseOptimisedCvText(payload.cvContent);
    if (!parsed.ok) {
      toast(parsed.message, 'error');
      router.replace('/cv/optimise/result');
      return;
    }
    setDraft(optimisedCvJsonToCvData(parsed.object));
    setSelectedTemplateId('classic');
    setAccent(DEFAULT_CV_ACCENT);
    setFontFamily('Inter');
    setSavedSnapshot(null); // never persisted until explicit Save
    setUndoPast([]);
    setUndoFuture([]);
    burstStartRef.current = null;
  }, [isDraftMode, router, toast]);

  useEffect(() => {
    if (isDraftMode || !jobCV || draft) return;
    const tid = jobCV.preferred_template_id ?? 'classic';
    const accentColor = jobCV.accent_color ?? DEFAULT_CV_ACCENT;
    const font = jobCV.font_family ?? 'Inter';
    const next = withDesign(
      profileToUniversalCV(jobCV as CVProfile),
      tid,
      accentColor,
      font
    );
    setDraft(next);
    setSelectedTemplateId(tid);
    setAccent(accentColor);
    setFontFamily(font);
    setSavedSnapshot(
      JSON.stringify({
        cv: next,
        coverLetter: '',
        templateId: tid,
        accent: accentColor,
        fontFamily: font,
      })
    );
    setUndoPast([]);
    setUndoFuture([]);
    burstStartRef.current = null;

    const jobId = (jobCV as { job_ids?: string[] }).job_ids?.[0];
    if (jobId) {
      void (async () => {
        try {
          const res = await fetch(`/api/cover-letters?jobId=${encodeURIComponent(jobId)}`);
          if (!res.ok) return;
          const list = (await res.json()) as Array<{
            id: string;
            content?: string | null;
          }>;
          const match = list[0];
          if (match?.content) {
            setCoverLetterText(match.content);
            setSavedSnapshot((prev) => {
              if (!prev) return prev;
              try {
                const parsed = JSON.parse(prev) as Record<string, unknown>;
                return JSON.stringify({ ...parsed, coverLetter: match.content });
              } catch {
                return prev;
              }
            });
            setDraftMeta((prev) =>
              prev
                ? {
                    ...prev,
                    generationType: 'both',
                    coverLetter: match.content ?? undefined,
                    savedCoverLetterId: match.id,
                  }
                : {
                    cvContent: '',
                    originalCvId: '',
                    generationType: 'both',
                    coverLetter: match.content ?? undefined,
                    savedCoverLetterId: match.id,
                  }
            );
          }
        } catch {
          /* ignore CL load failures */
        }
      })();
    }
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
        return data;
      });
    },
    []
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
      return p.slice(0, -1);
    });
  }, []);

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

  const refreshPreview = useCallback(async () => {
    if (!draft || !selectedTemplateId) return;
    setPreviewBusy(true);
    try {
      const snapshot = previewPayloadFromCVData(draft);
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
        return;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewSrc(url);
    } finally {
      setPreviewBusy(false);
    }
  }, [draft, selectedTemplateId, accent, fontFamily]);

  useEffect(() => {
    if (!draft || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 700);
    return () => window.clearTimeout(t);
  }, [draft, refreshPreview, templatesLoading]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const exportPdf = useCallback(async (format: ExportFormat = 'pdf') => {
    if (!draft || !selectedTemplateId) return;
    if (!allowed) {
      toast('Upgrade to export with this template.', 'error');
      return;
    }
    setExportingFormat(format);
    try {
      const result = await downloadCvExport(
        isDraftMode
          ? {
              template_id: selectedTemplateId,
              accent_color: accent,
              font_family: fontFamily,
              cv_snapshot: previewPayloadFromCVData(draft),
            }
          : {
              job_cv_id: id,
              template_id: selectedTemplateId,
              accent_color: accent,
              font_family: fontFamily,
              cv_snapshot: previewPayloadFromCVData(draft),
            },
        format
      );
      if (result === 'upgrade_required') {
        toast('DOCX export is a Pro feature. Upgrade to unlock.', 'error');
      } else if (result === 'error') {
        toast('Export failed.', 'error');
      }
    } finally {
      setExportingFormat(null);
    }
  }, [accent, allowed, draft, id, selectedTemplateId, toast, fontFamily, isDraftMode]);

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    const tid = normalizeTemplateId(selectedTemplateId) as TemplateId;
    if (ALL_TEMPLATE_IDS.includes(tid)) return;
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId]);

  const serializeEditor = useCallback(
    (
      data: CVData,
      tid: string,
      accentColor: string,
      font: string,
      cl: string
    ) =>
      JSON.stringify({
        cv: withDesign(data, tid, accentColor, font),
        coverLetter: cl,
        templateId: tid,
        accent: accentColor,
        fontFamily: font,
      }),
    []
  );

  const isDirty = useMemo(() => {
    if (!draft || savedSnapshot === null) {
      // Unsaved draft (never persisted) is always dirty until first Save
      return Boolean(isDraftMode && draft && !sessionSavedCvId && !draftMeta?.savedCvId);
    }
    return (
      serializeEditor(draft, selectedTemplateId, accent, fontFamily, coverLetterText) !==
      savedSnapshot
    );
  }, [
    draft,
    savedSnapshot,
    isDraftMode,
    sessionSavedCvId,
    draftMeta?.savedCvId,
    selectedTemplateId,
    accent,
    fontFamily,
    coverLetterText,
    serializeEditor,
  ]);

  const isPersisted =
    !isDraftMode || Boolean(sessionSavedCvId || draftMeta?.savedCvId);
  const persistedCvId = !isDraftMode
    ? id
    : sessionSavedCvId ?? draftMeta?.savedCvId ?? null;

  const stateKey = useMemo(() => {
    if (!draft) return '';
    return serializeEditor(draft, selectedTemplateId, accent, fontFamily, coverLetterText);
  }, [draft, selectedTemplateId, accent, fontFamily, coverLetterText, serializeEditor]);

  const saveJobCv = useCallback(async (
    displayName?: string,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    if (!draft) return false;
    if (isDraftMode && !draftMeta) return false;

    setPageSaveState('saving');
    setSaveError(false);
    try {
      const gen = genType;
      const designed = withDesign(draft, selectedTemplateId, accent, fontFamily);
      const cvContent = cvDataToOptimisedCvJson(designed);
      const coverLetterContent = coverLetterText.trim() || undefined;
      const resolvedName = displayName?.trim();

      if (isDraftMode && draftMeta) {
        let jobId = sessionSavedJobId ?? draftMeta.savedJobId ?? null;
        let cvId = sessionSavedCvId ?? draftMeta.savedCvId ?? null;

        if (!cvId) {
          if (!jobId) {
            const jobRes = await fetch('/api/jobs/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: draftMeta.jobUrl || undefined,
                keywords: draftMeta.analysis?.keywords?.length
                  ? draftMeta.analysis.keywords
                  : draftMeta.extractedKeywords ?? [],
                jobSummary: draftMeta.analysis?.jobSummary ?? '',
                title: draftMeta.analysis?.jobTitle ?? draftMeta.jobTitle ?? undefined,
                company: draftMeta.analysis?.company ?? draftMeta.companyName ?? undefined,
              }),
            });
            if (!jobRes.ok) {
              toast('Failed to save job.', 'error');
              setSaveError(true);
              setPageSaveState('idle');
              return false;
            }
            const jobJson = (await jobRes.json()) as { id: string };
            jobId = jobJson.id;
            setSessionSavedJobId(jobId);
          }

          const effectiveGen: GenerationType =
            gen === 'coverLetter'
              ? 'coverLetter'
              : coverLetterContent
                ? gen === 'cv'
                  ? 'both'
                  : gen
                : 'cv';
          const soRes = await fetch('/api/cvs/save-optimised', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvContent: effectiveGen !== 'coverLetter' ? cvContent : undefined,
              coverLetterContent:
                effectiveGen !== 'cv' ? coverLetterContent : undefined,
              originalCvId: draftMeta.originalCvId,
              jobId,
              generationType: effectiveGen,
              ai_changes_summary: draftMeta.aiChangesSummary ?? null,
              keywords_added: draftMeta.extractedKeywords ?? [],
              bullets_improved: draftMeta.bulletsImproved ?? 0,
              coverLetterTone: draftMeta.coverLetterTone,
              coverLetterLength: draftMeta.coverLetterLength,
              coverLetterEmphasis: draftMeta.coverLetterEmphasis ?? null,
              name: resolvedName,
            }),
          });
          if (!soRes.ok) {
            toast('Failed to save CV.', 'error');
            setSaveError(true);
            setPageSaveState('idle');
            return false;
          }
          const soJson = (await soRes.json()) as {
            cvId: string | null;
            coverLetterId: string | null;
          };
          cvId = soJson.cvId;
          if (cvId) setSessionSavedCvId(cvId);
          const optim = useOptimiseDraftStore.getState().draft;
          if (optim) {
            useOptimiseDraftStore.getState().setDraft({
              ...optim,
              savedJobId: jobId,
              savedCvId: cvId,
              savedCoverLetterId: soJson.coverLetterId,
            });
          }
          useOptimiseEditDraftStore.getState().setCvEditDraft({
            ...draftMeta,
            savedJobId: jobId,
            savedCvId: cvId,
            savedCoverLetterId: soJson.coverLetterId ?? undefined,
          });

          if (trackStatus && trackStatus !== 'none' && jobId) {
            await fetch(`/api/jobs/${jobId}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: trackStatus }),
            });
          }

          toast('CV saved successfully', 'success');
          if (cvId) {
            useOptimiseEditDraftStore.getState().setCvEditDraft(null);
            router.replace(`/cv/job-specific/${cvId}/edit`);
          }
        } else {
          const patchRes = await fetch(`/api/cvs/${cvId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvContent,
              ...(coverLetterContent ? { coverLetterContent } : {}),
              ...(resolvedName ? { name: resolvedName } : {}),
            }),
          });
          if (!patchRes.ok) {
            toast('Could not save changes.', 'error');
            setSaveError(true);
            setPageSaveState('idle');
            return false;
          }
          if (!options?.silent) toast('Changes saved', 'success');
          void queryClient.invalidateQueries({ queryKey: ['job-detail'] });
          void queryClient.invalidateQueries({ queryKey: ['all-cvs'] });
        }
      } else if (!isDraftMode) {
        const patchRes = await fetch(`/api/cvs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvContent,
            ...(coverLetterContent ? { coverLetterContent } : {}),
            ...(resolvedName ? { name: resolvedName } : {}),
          }),
        });
        if (!patchRes.ok) {
          if (!options?.silent) toast('Could not save changes.', 'error');
          setSaveError(true);
          setPageSaveState('idle');
          return false;
        }
        if (!options?.silent) toast('Changes saved', 'success');
        void queryClient.invalidateQueries({ queryKey: ['job-specific-cv', id] });
        void queryClient.invalidateQueries({ queryKey: ['all-cvs'] });
      }

      setSavedSnapshot(
        serializeEditor(draft, selectedTemplateId, accent, fontFamily, coverLetterText)
      );
      setPageSaveState('saved');
      window.setTimeout(() => setPageSaveState('idle'), 1800);
      return true;
    } catch {
      toast('Could not save.', 'error');
      setSaveError(true);
      setPageSaveState('idle');
      return false;
    }
  }, [
    draft,
    isDraftMode,
    draftMeta,
    genType,
    coverLetterText,
    selectedTemplateId,
    accent,
    fontFamily,
    sessionSavedJobId,
    sessionSavedCvId,
    trackStatus,
    toast,
    router,
    queryClient,
    id,
    serializeEditor,
  ]);

  const { autosaveState, retryAutosave } = useCVEditorAutosave({
    stateKey,
    cvId: persistedCvId,
    isNew: !isPersisted,
    isDirty,
    isSaving: pageSaveState === 'saving',
    handleSave: () => saveJobCv(undefined, { silent: true }),
    enabled: isPersisted && Boolean(persistedCvId),
  });

  const backHref = isDraftMode ? '/cv/optimise' : '/cv/job-specific';

  const navigateBack = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  const handleBackClick = useCallback(() => {
    if (!isPersisted && isDirty) {
      setLeaveModalOpen(true);
      return;
    }
    if (isPersisted && isDirty) {
      void (async () => {
        await saveJobCv(undefined, { silent: true });
        navigateBack();
      })();
      return;
    }
    navigateBack();
  }, [isPersisted, isDirty, saveJobCv, navigateBack]);

  const handleDiscardLeave = useCallback(() => {
    useOptimiseEditDraftStore.getState().setCvEditDraft(null);
    setLeaveModalOpen(false);
    navigateBack();
  }, [navigateBack]);

  const handleSaveAndLeave = useCallback(async () => {
    setLeaveSaving(true);
    leaveAfterSaveRef.current = true;
    try {
      const role =
        jobTitle ||
        draftMeta?.jobTitle ||
        draftMeta?.analysis?.jobTitle ||
        draft?.personal?.title;
      const company =
        companyName ?? draftMeta?.companyName ?? draftMeta?.analysis?.company;
      const name = defaultJobCvDisplayName(role, company);
      const ok = await saveJobCv(name);
      if (ok) {
        setLeaveModalOpen(false);
        navigateBack();
      }
    } finally {
      leaveAfterSaveRef.current = false;
      setLeaveSaving(false);
    }
  }, [
    jobTitle,
    draftMeta,
    draft?.personal?.title,
    companyName,
    saveJobCv,
    navigateBack,
  ]);

  const openSaveTitleModal = useCallback(() => {
    const role =
      jobTitle ||
      draftMeta?.jobTitle ||
      draftMeta?.analysis?.jobTitle ||
      draft?.personal?.title;
    const company =
      companyName ?? draftMeta?.companyName ?? draftMeta?.analysis?.company;
    const generated = defaultJobCvDisplayName(role, company);
    const current = jobCV?.name?.trim();
    setTitleModalDefault(
      !isDraftMode && current && current !== 'Tailored CV' ? current : generated
    );
    setTitleModalOpen(true);
  }, [
    jobTitle,
    draftMeta,
    draft?.personal?.title,
    companyName,
    jobCV?.name,
    isDraftMode,
  ]);

  const confirmSaveWithTitle = useCallback(
    async (title: string) => {
      const ok = await saveJobCv(title);
      if (ok) setTitleModalOpen(false);
    },
    [saveJobCv]
  );

  const openDiffViewer = useCallback(async () => {
    if (!draft) return;
    const oid = draftMeta?.originalCvId ?? coreVersions[0]?.id ?? null;
    if (!oid) {
      setDiffError('Could not load original CV for comparison. Please try again.');
      setDiffSections([]);
      setDiffOpen(true);
      return;
    }
    setDiffLoading(true);
    setDiffError(null);
    try {
      const res = await fetch(`/api/cvs/${oid}`);
      if (!res.ok) {
        setDiffError('Could not load original CV for comparison. Please try again.');
        setDiffSections([]);
        setDiffOpen(true);
        return;
      }
      const profile = (await res.json()) as CVProfile;
      const origJson = cvDataToOptimisedCvJson(cvProfileToCvData(profile));
      const tailoredJson = cvDataToOptimisedCvJson(draft);
      setDiffSections(computeCvDiffSections(origJson, tailoredJson));
      setDiffOpen(true);
    } catch {
      setDiffError('Could not load original CV for comparison. Please try again.');
      setDiffSections([]);
      setDiffOpen(true);
    } finally {
      setDiffLoading(false);
    }
  }, [draft, draftMeta?.originalCvId, coreVersions]);

  const handleTrackPopupSave = useCallback(async () => {
    if (!pendingTrackStatus) return;
    if (isDraftMode && !draftMeta) return;
    setTrackPopupSaving(true);
    try {
      let jobId = sessionSavedJobId ?? draftMeta?.savedJobId ?? effectiveJobId ?? null;
      if (!jobId) {
        const jobSaveBody = draftMeta
          ? {
              url: draftMeta.jobUrl || undefined,
              keywords: draftMeta.analysis?.keywords?.length
                ? draftMeta.analysis.keywords
                : draftMeta.extractedKeywords ?? [],
              jobSummary: draftMeta.analysis?.jobSummary ?? '',
              title: draftMeta.analysis?.jobTitle ?? draftMeta.jobTitle ?? undefined,
              company: draftMeta.analysis?.company ?? draftMeta.companyName ?? undefined,
            }
          : {
              keywords,
              jobSummary: jobCV?.job_description ?? '',
              title: jobTitle || undefined,
              company: companyName ?? undefined,
            };

        const jobRes = await fetch('/api/jobs/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobSaveBody),
        });
        if (!jobRes.ok) {
          toast('Could not save job.', 'error');
          return;
        }
        const j = (await jobRes.json()) as { id: string };
        jobId = j.id;
        setSessionSavedJobId(jobId);
        const od = useOptimiseDraftStore.getState().draft;
        if (od) {
          useOptimiseDraftStore.getState().setDraft({ ...od, savedJobId: jobId });
        }
        if (draftMeta) {
          useOptimiseEditDraftStore.getState().setCvEditDraft({
            ...draftMeta,
            savedJobId: jobId,
          });
        }
      }

      const patchRes = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: pendingTrackStatus }),
      });
      if (!patchRes.ok) {
        toast('Could not update status.', 'error');
        return;
      }

      if (!isDraftMode && id && !effectiveJobId) {
        const linkRes = await fetch(`/api/jobs/${jobId}/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cv', assetId: id, action: 'link' }),
        });
        if (!linkRes.ok) {
          toast('Status saved but could not link job to this CV.', 'error');
        } else {
          void queryClient.invalidateQueries({ queryKey: ['job-specific-cv', id] });
        }
      }

      queryClient.setQueryData(['job-detail', jobId], { status: pendingTrackStatus });
      toast(
        `Status updated to ${JOB_STATUS_CONFIG[pendingTrackStatus as Exclude<JobStatus, 'none'>].label}`,
        'success'
      );
      void queryClient.invalidateQueries({ queryKey: ['job-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      void queryClient.invalidateQueries({ queryKey: ['tracked-jobs-count'] });
      setTrackPopupOpen(false);
    } catch {
      toast('Something went wrong.', 'error');
    } finally {
      setTrackPopupSaving(false);
    }
  }, [
    pendingTrackStatus,
    isDraftMode,
    draftMeta,
    sessionSavedJobId,
    effectiveJobId,
    keywords,
    jobCV?.job_description,
    jobTitle,
    companyName,
    id,
    toast,
    queryClient,
  ]);

  const deleteJobCv = useCallback(async () => {
    if (!id || isDraftMode) return;
    if (!window.confirm('Delete this job-specific CV?')) return;
    try {
      await archive.mutateAsync(id);
      toast('Job CV deleted.', 'success');
      router.push('/cv/job-specific');
    } catch {
      toast('Could not delete job CV.', 'error');
    }
  }, [id, archive, toast, router, isDraftMode]);

  const aiJobContext = useMemo(
    () => ({
      jobTitle: jobTitle || null,
      companyName,
      jobDescription:
        jobCV?.job_description?.trim() ||
        (keywords.length ? keywords.join(', ') : null),
      keywords,
    }),
    [jobTitle, companyName, jobCV?.job_description, keywords]
  );
  const ats = draft
    ? buildATSReport(draft, keywords)
    : { score: 0, summary: '', suggestions: [], sections: {} };

  const openTrackPopup = useCallback(() => {
    setPendingTrackStatus(
      trackStatus && trackStatus !== 'none' ? trackStatus : 'apply_later'
    );
    setTrackPopupOpen(true);
  }, [trackStatus]);

  const pageLoading =
    (isDraftMode && (!draft || !draftMeta)) ||
    (!isDraftMode && (jobCvLoading || !jobCV || !draft));

  if (pageLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  const displayCompany =
    companyName ??
    draftMeta?.companyName ??
    draftMeta?.analysis?.company ??
    '—';
  const displayJobTitle =
    jobTitle || draftMeta?.jobTitle || draftMeta?.analysis?.jobTitle || '—';

  const trackButtonLabel =
    !trackStatus || trackStatus === 'none'
      ? 'Track Job'
      : jobStatusShortLabel(trackStatus);

  const trackRingClass =
    trackStatus && trackStatus !== 'none'
      ? JOB_STATUS_CONFIG[trackStatus].borderClass
      : 'border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-300';

  const isUnsavedDraft =
    isDraftMode && !sessionSavedCvId && !(draftMeta?.savedCvId ?? null);

  const saveLabel =
    pageSaveState === 'saving' || (isPersisted && autosaveState === 'saving')
      ? 'Saving…'
      : pageSaveState === 'saved' || (isPersisted && autosaveState === 'saved' && !isDirty)
        ? 'Saved to account'
        : saveError || (isPersisted && autosaveState === 'error')
          ? "Couldn't save"
          : !isPersisted && (isDirty || isUnsavedDraft)
            ? 'Unsaved changes'
            : isPersisted && isDirty
              ? 'Unsaved changes'
              : '';

  const editingCvBody = !(genType === 'both' && documentTab === 'coverLetter');

  return (
    <div className="cv-editor-text-tune mx-auto max-w-[1800px] space-y-4 pb-24 md:pb-8">
      <UnsavedLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onDiscard={handleDiscardLeave}
        onSaveAndLeave={() => void handleSaveAndLeave()}
        saving={leaveSaving}
        entityLabel="CV"
      />
      <CvTitleModal
        isOpen={titleModalOpen}
        defaultTitle={titleModalDefault}
        onClose={() => setTitleModalOpen(false)}
        onConfirm={confirmSaveWithTitle}
        isSubmitting={pageSaveState === 'saving'}
        submitLabel={
          pageSaveState === 'saving' ? 'Saving…' : isUnsavedDraft ? 'Save CV' : 'Save'
        }
      />
      <CVEditorTopBar
        backHref={backHref}
        backLabel={isDraftMode ? 'Back to tailor' : 'Back to job CVs'}
        onBackClick={handleBackClick}
        title="Job-tailored CV"
        subtitle={`${displayCompany} · ${displayJobTitle}`}
        caption="Tailored for this job — not your master CV"
        badge={
          isUnsavedDraft ? (
            <span className="rounded-full border border-amber-400/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Unsaved draft
            </span>
          ) : null
        }
        atsScore={editingCvBody ? ats.score : null}
        onOpenAts={() => setAtsDrawerOpen(true)}
        keywords={
          editingCvBody
            ? {
                show: true,
                count: keywords.length,
                open: keywordsPopoverOpen,
                onToggle: () => setKeywordsPopoverOpen((v) => !v),
              }
            : undefined
        }
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
          label:
            pageSaveState === 'saving'
              ? 'Saving…'
              : pageSaveState === 'saved'
                ? 'Saved ✓'
                : 'Save',
          loading: pageSaveState === 'saving',
          disabled: pageSaveState === 'saving',
          highlight: isDirty || isUnsavedDraft,
          onClick: () => openSaveTitleModal(),
        }}
        statusLine={saveLabel || undefined}
        onRetrySave={
          saveError || autosaveState === 'error'
            ? () => void (autosaveState === 'error' ? retryAutosave() : saveJobCv())
            : undefined
        }
        focusMode={editingCvBody ? focusMode : 'default'}
        onFocusModeChange={setFocusMode}
        trailingControls={
          <ExportMenu
            label="Export"
            busyFormat={exportingFormat}
            disabled={!allowed || !draft || !selectedTemplateId}
            canDocx={canAccessFeature(tier, 'docxExport')}
            onExport={(format) => {
              void exportPdf(format);
            }}
          />
        }
        moreMenuItems={(close) => (
          <>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]"
              onClick={() => {
                openTrackPopup();
                close();
              }}
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              {trackButtonLabel}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={diffLoading}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                void openDiffViewer();
                close();
              }}
            >
              <GitCompareArrows className="h-4 w-4 shrink-0" />
              Compare with master
            </button>
            {!isDraftMode ? (
              <button
                type="button"
                role="menuitem"
                disabled={archive.isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-accent-coral)] transition hover:bg-[var(--color-hover-surface)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  void deleteJobCv();
                  close();
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete
              </button>
            ) : null}
          </>
        )}
        bottomRow={
          genType === 'both' ? (
            <Tabs
              className="max-w-md"
              tabs={[
                { id: 'cv', label: 'CV' },
                { id: 'coverLetter', label: 'Cover Letter' },
              ]}
              value={documentTab}
              onChange={(tid) => setDocumentTab(tid as 'cv' | 'coverLetter')}
            />
          ) : undefined
        }
      />

      {editingCvBody ? (
        <>
          <ATSDrawer open={atsDrawerOpen} onOpenChange={setAtsDrawerOpen} report={ats} />
          <KeywordPopover
            open={keywordsPopoverOpen}
            onOpenChange={setKeywordsPopoverOpen}
            keywords={keywords}
            cv={draft}
            jobDescriptionText={jobCV?.job_description ?? null}
          />
        </>
      ) : null}

      {draftMeta?.analysis ? (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
            onClick={() => setAnalysisOpen((v) => !v)}
          >
            <span className="text-[var(--color-muted)]">
              <span className="mr-1">📍</span>
              {draftMeta.analysis.region ?? '—'} · {draftMeta.analysis.workType ?? '—'} · Match:{' '}
              {draftMeta.analysis.matchPercentage}%
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 transition', analysisOpen && 'rotate-180')}
            />
          </button>
          {analysisOpen ? (
            <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-5 w-5 text-[var(--color-muted)]" />
                  <div>
                    <p className="font-display font-semibold">
                      {[draftMeta.analysis.jobTitle, draftMeta.analysis.company]
                        .filter(Boolean)
                        .join(' at ') || 'Role analysis'}
                    </p>
                  </div>
                </div>
                {draftMeta.analysis.workType ? (
                  <Badge variant="default" className="capitalize">
                    {draftMeta.analysis.workType}
                  </Badge>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">Key requirements</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {draftMeta.analysis.keyRequirements.slice(0, 8).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-800">Why you&apos;re a good fit</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {draftMeta.analysis.whyGoodFit.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Gaps to address
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {draftMeta.analysis.whyNotGoodFit.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative mt-1 px-1 sm:px-0">
        {pageSaveState === 'saving' ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/75">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : null}

        {genType === 'both' && documentTab === 'coverLetter' ? (
          <div className="mt-2 grid max-w-4xl gap-4">
            <div className={CV_EDITOR_CANVAS}>
              <p className="mb-2 text-sm font-semibold">Cover letter</p>
              <Textarea
                value={coverLetterText}
                onChange={(e) => setCoverLetterText(e.target.value)}
                className="min-h-[420px] text-sm leading-relaxed"
              />
            </div>
            <p className="text-sm text-[var(--color-muted)]">
              Export cover letter to PDF from the cover letter page after you save.
            </p>
            <CVEditorMobileBar
              primaryLabel={pageSaveState === 'saving' ? 'Saving…' : 'Save'}
              primaryLoading={pageSaveState === 'saving'}
              onPrimaryClick={() => openSaveTitleModal()}
            />
          </div>
        ) : (
          <CVEditorShell
            focusMode={focusMode}
            editorTab={editorTab}
            onEditorTabChange={setEditorTab}
            cvData={draft}
            previewControl={previewControl}
            onSectionVisibilityChange={(next: CVSectionVisibility) =>
              handleChange({ ...draft, sectionVisibility: next })
            }
            editorCanvas={
              <div className={CV_EDITOR_CANVAS}>
                <CVEditorPanel
                  value={draft}
                  onChange={handleChange}
                  activeTab={editorTab}
                  onActiveTabChange={setEditorTab}
                  highlightedKeywords={keywords}
                  aiJobContext={aiJobContext}
                  hideAtsBanner
                  hideFormTabBar
                  hideVisibilityPanel
                  hideKeywordsBanner
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={(nextId: string) => {
                    setSelectedTemplateId(nextId);
                  }}
                  accent={accent}
                  onAccentChange={(c: string) => {
                    setAccent(c);
                  }}
                  fontFamily={fontFamily}
                  onFontFamilyChange={(next) => {
                    setFontFamily(next);
                  }}
                  userTier={tier}
                />
              </div>
            }
            preview={{
              previewSrc,
              previewBusy,
              zoom,
              onZoomChange: setZoom,
              currentPage: page,
              onPageChange: setPage,
              footerSlot:
                !templatesLoading && !allowed && templateMeta ? (
                  <p className="rounded-xl border border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/10 px-3 py-2 text-sm text-[var(--color-accent-gold)]">
                    You can preview this layout with your data here. Upgrade to export with this
                    template.
                  </p>
                ) : undefined,
            }}
            mobileBar={{
              primaryLabel: pageSaveState === 'saving' ? 'Saving…' : 'Save',
              primaryLoading: pageSaveState === 'saving',
              onPrimaryClick: () => openSaveTitleModal(),
              leftSlot: (
                <button
                  type="button"
                  onClick={openTrackPopup}
                  className={cn(
                    'rounded-full border-2 px-3 py-2 text-xs font-semibold',
                    trackRingClass
                  )}
                >
                  {trackButtonLabel}
                </button>
              ),
            }}
            className="mt-2"
          />
        )}
      </div>

      <Modal
        isOpen={trackPopupOpen}
        onClose={() => setTrackPopupOpen(false)}
        title="Track This Job"
        className="max-w-3xl"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TRACK_STATUS_OPTIONS.map((s) => {
            const cfg = JOB_STATUS_CONFIG[s];
            const active = pendingTrackStatus === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setPendingTrackStatus(s)}
                className={cn(
                  'rounded-xl border-2 p-3 text-left text-sm font-medium transition',
                  active
                    ? cn(cfg.bgColor, cfg.textColor, cfg.borderClass)
                    : 'border-[var(--color-border)] hover:bg-[var(--color-input-bg)]'
                )}
              >
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTrackPopupOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={trackPopupSaving}
            disabled={!pendingTrackStatus}
            onClick={() => void handleTrackPopupSave()}
          >
            Save
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={diffOpen}
        onClose={() => setDiffOpen(false)}
        title="CV Differences"
        className="max-h-[min(92vh,900px)] max-w-4xl overflow-hidden"
      >
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Comparing: Your Core CV → Tailored CV
          {(() => {
            const st = summarizeDiff(diffSections);
            return (
              <span className="ml-2 font-medium text-[var(--color-text-primary)]">
                {st.sectionsChanged} sections changed, {st.additions} additions, {st.removals} removals
              </span>
            );
          })()}
        </p>
        {diffLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : diffError ? (
          <p className="text-sm text-red-600">{diffError}</p>
        ) : (
          <div className="max-h-[min(70vh,720px)] space-y-6 overflow-y-auto pr-1">
            {diffSections.map((sec) => (
              <div key={sec.sectionName}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)]">
                    {sec.sectionName}
                  </h3>
                  {!sec.hasChanges ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--color-primary)]"
                      onClick={() =>
                        setUncollapsedDiffSections((m) => ({
                          ...m,
                          [sec.sectionName]: !m[sec.sectionName],
                        }))
                      }
                    >
                      {uncollapsedDiffSections[sec.sectionName] ? 'Hide' : 'Show'} unchanged
                    </button>
                  ) : null}
                </div>
                {!sec.hasChanges && !uncollapsedDiffSections[sec.sectionName] ? (
                  <p className="text-xs text-[var(--color-muted)]">No changes in this section.</p>
                ) : (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] p-3 text-sm">
                    {sec.changes.map((ch, i) => (
                      <div
                        key={`${sec.sectionName}-${i}`}
                        className={cn(
                          'mb-2 flex gap-2 rounded-md border-l-2 pl-2 last:mb-0',
                          ch.type === 'removed' &&
                            'border-red-500 bg-[rgba(239,68,68,0.3)]',
                          ch.type === 'added' &&
                            'border-green-500 bg-[rgba(34,197,94,0.3)]',
                          ch.type === 'unchanged' && 'border-transparent opacity-80'
                        )}
                      >
                        <span className="shrink-0 text-[10px] font-bold uppercase text-[var(--color-muted)]">
                          {ch.type === 'removed' ? 'Prev' : ch.type === 'added' ? 'New' : '·'}
                        </span>
                        <span className="min-w-0 whitespace-pre-wrap">{ch.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
