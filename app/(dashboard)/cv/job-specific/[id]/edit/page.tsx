'use client';

/**
 * Layout history: legacy job editor stacked a tall header, separate core-CV sync panel, expandable keyword/JD tray,
 * and an always-visible ATS stack beside a fixed-width preview — shrinking the form. Refactor keeps every control
 * but moves ATS into a drawer, keywords into a contextual popover, and uses a 3-column shell + focus modes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Sidebar } from '@/components/cv/premium/Sidebar';
import { PreviewPanel } from '@/components/cv/premium/PreviewPanel';
import { CVEditorTopBar } from '@/components/cv/premium/CVEditorTopBar';
import type { CVEditorFocusMode } from '@/components/cv/premium/CVEditorTopBar';
import { ATSDrawer } from '@/components/cv/premium/ATSDrawer';
import { KeywordPopover } from '@/components/cv/premium/KeywordPopover';
import type { CVFormTab } from '@/components/cv/CVFormFields';
import type { CVSectionVisibility } from '@/types';
import { useJobSpecificCV, useArchiveJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useCoreCVVersions } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDate, cn } from '@/lib/utils';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { buildATSReport } from '@/lib/cv-ats';
import { cloneCvData } from '@/lib/cv-clone';
import { useToast } from '@/components/ui/toast';
import { CV_EDITOR_CANVAS } from '@/lib/cv-editor-styles';
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
import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import {
  Loader2,
  GitCompareArrows,
  MapPin,
  Building2,
  AlertTriangle,
  ChevronDown,
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

/** Payload for PATCH /api/cv (core profile), matching core editor save. */

function cvProfileToCvData(profile: CVProfile): CVData {
  return profileToUniversalCV(profile);
}

const TRACK_STATUS_OPTIONS = TRACKABLE_JOB_STATUSES;

function coreCvPatchFromDraft(
  data: CVData,
  preferredTemplateId: string,
  fontFamily: string,
  accent: string
) {
  return {
    ...universalToProfilePayload(
      withDesign(data, preferredTemplateId, accent, fontFamily)
    ),
    original_cv_file_url: null,
  };
}

export default function JobCVEditPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const isDraftMode = id === 'draft';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: jobCV, isLoading: jobCvLoading } = useJobSpecificCV(
    isDraftMode ? undefined : id
  );
  const archive = useArchiveJobSpecificCV();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();
  const [keywordsPopoverOpen, setKeywordsPopoverOpen] = useState(false);
  const [atsDrawerOpen, setAtsDrawerOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<CVEditorFocusMode>('default');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const { tier } = useSubscription();
  const { toast } = useToast();

  const [draft, setDraft] = useState<CVData | null>(null);
  const draftRef = useRef<CVData | null>(null);
  draftRef.current = draft;

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState<string>('#6C63FF');
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [previewIsPdf, setPreviewIsPdf] = useState(true);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editorTab, setEditorTab] = useState<CVFormTab>('photo');
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [autosaveState, setAutosaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [targetCoreCvId, setTargetCoreCvId] = useState<string | null>(null);
  const [savingCore, setSavingCore] = useState(false);

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

  const genType: GenerationType = isDraftMode
    ? draftMeta?.generationType ?? 'cv'
    : 'cv';

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
    setAccent('#6C63FF');
    setFontFamily('Inter');
    setUndoPast([]);
    setUndoFuture([]);
    burstStartRef.current = null;
  }, [isDraftMode, router, toast]);

  useEffect(() => {
    if (isDraftMode || !jobCV || draft) return;
    setDraft(
      withDesign(
        profileToUniversalCV(jobCV as CVProfile),
        jobCV.preferred_template_id ?? 'classic',
        jobCV.accent_color ?? '#6C63FF',
        jobCV.font_family ?? 'Inter'
      )
    );
    setSelectedTemplateId(jobCV.preferred_template_id ?? 'classic');
    setAccent(jobCV.accent_color ?? '#6C63FF');
    setFontFamily(jobCV.font_family ?? 'Inter');
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
        body: JSON.stringify(
          isDraftMode
            ? {
                type: 'cv',
                template_id: selectedTemplateId,
                accent_color: accent,
                font_family: fontFamily,
                cv_snapshot: snapshot,
              }
            : {
                type: 'cv',
                job_cv_id: id,
                template_id: selectedTemplateId,
                accent_color: accent,
                font_family: fontFamily,
                cv_snapshot: snapshot,
              }
        ),
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
  }, [draft, selectedTemplateId, accent, id, fontFamily, isDraftMode]);

  useEffect(() => {
    if (!draft || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 700);
    return () => window.clearTimeout(t);
  }, [draft, refreshPreview, templatesLoading]);

  useEffect(() => {
    return () => {
      setPreviewSrc((prev) => {
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev.split('#')[0]);
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
        body: JSON.stringify(
          isDraftMode
            ? {
                type: 'cv',
                template_id: selectedTemplateId,
                accent_color: accent,
                font_family: fontFamily,
                cv_snapshot: previewPayloadFromCVData(draft),
              }
            : {
                type: 'cv',
                job_cv_id: id,
                template_id: selectedTemplateId,
                accent_color: accent,
                font_family: fontFamily,
                cv_snapshot: previewPayloadFromCVData(draft),
              }
        ),
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
  }, [accent, allowed, draft, id, selectedTemplateId, toast, fontFamily, isDraftMode]);

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    const tid = normalizeTemplateId(selectedTemplateId) as TemplateId;
    if (ALL_TEMPLATE_IDS.includes(tid)) return;
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
    if (isDraftMode && !draftMeta) return;

    setPageSaveState('saving');
    try {
      const gen = genType;
      const cvContent = cvDataToOptimisedCvJson(draft);
      const cl =
        gen === 'coverLetter' || gen === 'both' ? coverLetterText.trim() : '';

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
              setPageSaveState('idle');
              return;
            }
            const jobJson = (await jobRes.json()) as { id: string };
            jobId = jobJson.id;
            setSessionSavedJobId(jobId);
          }

          const soRes = await fetch('/api/cvs/save-optimised', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cvContent: gen !== 'coverLetter' ? cvContent : undefined,
              coverLetterContent: gen !== 'cv' ? cl : undefined,
              originalCvId: draftMeta.originalCvId,
              jobId,
              generationType: gen,
              ai_changes_summary: draftMeta.aiChangesSummary ?? null,
              keywords_added: draftMeta.extractedKeywords ?? [],
              bullets_improved: draftMeta.bulletsImproved ?? 0,
              coverLetterTone: draftMeta.coverLetterTone,
              coverLetterLength: draftMeta.coverLetterLength,
              coverLetterEmphasis: draftMeta.coverLetterEmphasis ?? null,
            }),
          });
          if (!soRes.ok) {
            toast('Failed to save CV.', 'error');
            setPageSaveState('idle');
            return;
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
              coverLetterContent: gen !== 'cv' ? cl : undefined,
            }),
          });
          if (!patchRes.ok) {
            toast('Could not save changes.', 'error');
            setPageSaveState('idle');
            return;
          }
          toast('Changes saved', 'success');
          void queryClient.invalidateQueries({ queryKey: ['job-detail'] });
        }
      } else if (!isDraftMode) {
        const patchRes = await fetch(`/api/cvs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cvContent,
            coverLetterContent: gen !== 'cv' ? cl : undefined,
          }),
        });
        if (!patchRes.ok) {
          toast('Could not save changes.', 'error');
          setPageSaveState('idle');
          return;
        }
        toast('Changes saved', 'success');
        void queryClient.invalidateQueries({ queryKey: ['job-specific-cv', id] });
      }

      setPageSaveState('saved');
      window.setTimeout(() => setPageSaveState('idle'), 1800);
    } catch {
      toast('Could not save.', 'error');
      setPageSaveState('idle');
    }
  }, [
    draft,
    isDraftMode,
    draftMeta,
    genType,
    coverLetterText,
    sessionSavedJobId,
    sessionSavedCvId,
    trackStatus,
    toast,
    router,
    queryClient,
    id,
  ]);

  const openDiffViewer = useCallback(async () => {
    if (!draft) return;
    const oid =
      draftMeta?.originalCvId ?? targetCoreCvId ?? coreVersions[0]?.id ?? null;
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
  }, [draft, draftMeta?.originalCvId, targetCoreCvId, coreVersions]);

  const handleTrackPopupSave = useCallback(async () => {
    if (!pendingTrackStatus || !draftMeta) return;
    setTrackPopupSaving(true);
    try {
      let jobId = sessionSavedJobId ?? draftMeta.savedJobId ?? effectiveJobId ?? null;
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
        useOptimiseEditDraftStore.getState().setCvEditDraft({
          ...draftMeta,
          savedJobId: jobId,
        });
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
    draftMeta,
    sessionSavedJobId,
    effectiveJobId,
    toast,
    queryClient,
  ]);

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
          ...coreCvPatchFromDraft(draft, selectedTemplateId, fontFamily, accent),
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
  }, [draft, targetCoreCvId, selectedTemplateId, toast, queryClient, fontFamily, accent]);

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
      : 'border-slate-400 text-slate-700';

  const isUnsavedDraft =
    isDraftMode && !sessionSavedCvId && !(draftMeta?.savedCvId ?? null);

  const saveLabel =
    pageSaveState === 'saving'
      ? 'Saving…'
      : pageSaveState === 'saved'
        ? 'Saved ✓'
        : '';

  const editingCvBody = !(genType === 'both' && documentTab === 'coverLetter');

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 pb-24 md:pb-8">
      <CVEditorTopBar
        backHref={isDraftMode ? '/cv/optimise' : '/cv/job-specific'}
        title="Job-tailored CV"
        subtitle={`${displayCompany} · ${displayJobTitle}`}
        badge={
          isUnsavedDraft ? (
            <span className="rounded-full border border-amber-400/80 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Unsaved draft
            </span>
          ) : null
        }
        centerSlot={
          <div className="flex w-full max-w-lg flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-center">
            <div className="min-w-0 flex-1">
              <Select
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
                className="py-2 text-xs"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-9 shrink-0"
              loading={savingCore}
              disabled={!draft || !targetCoreCvId || !coreVersions.length}
              onClick={() => void updateCoreCvFromJob()}
              title="Apply this editor content to the selected core CV. Does not modify this job CV."
            >
              Update core CV
            </Button>
          </div>
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
        secondaryAction={{
          label: 'Export PDF',
          loading: exporting,
          disabled: !allowed,
          onClick: () => void exportPdf(),
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
          onClick: () => void saveJobCv(),
        }}
        statusLine={saveLabel}
        focusMode={editingCvBody ? focusMode : 'default'}
        onFocusModeChange={setFocusMode}
        trailingControls={
          <>
            <button
              type="button"
              onClick={() => {
                setPendingTrackStatus(
                  trackStatus && trackStatus !== 'none' ? trackStatus : 'apply_later'
                );
                setTrackPopupOpen(true);
              }}
              className={cn(
                'inline-flex h-9 shrink-0 items-center rounded-full border-2 px-3 text-xs font-semibold transition',
                trackRingClass
              )}
            >
              {trackButtonLabel}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-9 md:inline-flex"
              disabled={diffLoading}
              onClick={() => void openDiffViewer()}
              icon={<GitCompareArrows className="h-4 w-4" />}
            >
              Diff
            </Button>
            {!isDraftMode ? (
              <Button
                variant="secondary"
                size="sm"
                className="hidden h-9 border-[var(--color-accent-coral)]/40 text-[var(--color-accent-coral)] lg:inline-flex"
                loading={archive.isPending}
                onClick={() => void deleteJobCv()}
              >
                Delete
              </Button>
            ) : null}
          </>
        }
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
          </div>
        ) : (
          <div
            className={cn(
              'mt-2 grid gap-4',
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
                  cvData={draft}
                  sectionVisibility={draft.sectionVisibility}
                  onSectionVisibilityChange={(next: CVSectionVisibility) =>
                    handleChange({ ...draft, sectionVisibility: next })
                  }
                />
              ) : null
            ) : null}

            {focusMode !== 'preview' ? (
              <div className="min-w-0 space-y-3">
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
                {!templatesLoading && !allowed && templateMeta ? (
                  <p className="rounded-xl border border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/10 px-3 py-2 text-sm text-[var(--color-accent-gold)]">
                    You can preview this layout with your data here. Upgrade to export with this template.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 p-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => {
            setPendingTrackStatus(
              trackStatus && trackStatus !== 'none' ? trackStatus : 'apply_later'
            );
            setTrackPopupOpen(true);
          }}
          className={cn(
            'rounded-full border-2 px-3 py-2 text-xs font-semibold',
            trackRingClass
          )}
        >
          {trackButtonLabel}
        </button>
        <Button
          variant="primary"
          size="sm"
          loading={pageSaveState === 'saving'}
          onClick={() => void saveJobCv()}
        >
          {pageSaveState === 'saving' ? 'Saving…' : 'Save'}
        </Button>
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
