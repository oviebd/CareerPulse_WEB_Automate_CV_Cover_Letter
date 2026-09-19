'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { LayoutTemplate } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { CVRewriteWithAIModal } from '@/components/cv/CVRewriteWithAIModal';
import { CvAtsPolishButton } from '@/components/cv/CvAtsPolishButton';
import { CoverLetterPrintPreviewFrame } from '@/components/cover-letter/CoverLetterPrintPreviewFrame';
import { CoverLetterTemplatePicker } from '@/components/cover-letter/CoverLetterTemplatePicker';
import {
  useCoverLetter,
  useUpdateCoverLetter,
} from '@/hooks/useCoverLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { useRequirePremium } from '@/hooks/useRequirePremium';
import { apiFetch } from '@/lib/api-fetch';
import { useCoverLetterTemplates } from '@/hooks/useTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { canUseTemplate, canAccessFeature } from '@/lib/subscription';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { UnsavedLeaveModal } from '@/components/shared/UnsavedLeaveModal';
import { exportCoverLetter, type ExportFormat } from '@/lib/export-client';
import { formatDate } from '@/lib/utils';
import type { CVTemplate, SubscriptionTier, CoverLetter } from '@/types';
import type { Job } from '@/types/database';
import { useOptimiseDraftStore } from '@/stores/useOptimiseDraftStore';
import {
  useOptimiseEditDraftStore,
  type CoverLetterOptimiseEditDraft,
} from '@/stores/useOptimiseEditDraftStore';
import {
  defaultCoverLetterDisplayName,
  isPlaceholderClName,
} from '@/lib/cv-display-name';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { applyPreviewHtmlResponse, revokePreviewBlob } from '@/lib/preview-html-client';

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

function serializeCoverLetterEditorState(p: {
  content: string;
  templateId: string;
  companyName: string;
  jobTitle: string;
  applicantName: string;
  applicantRole: string;
  applicantEmail: string;
  applicantPhone: string;
  applicantLocation: string;
}): string {
  return JSON.stringify(p);
}

function resolveClSaveName(
  storedName: string | null | undefined,
  applicantName: string,
  jobTitle: string,
  companyName: string
): string | undefined {
  if (storedName?.trim() && !isPlaceholderClName(storedName)) return undefined;
  return defaultCoverLetterDisplayName({
    applicantName,
    jobTitle,
    companyName,
  });
}

export default function CoverLetterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const isDraftMode = id === 'draft';
  const { toast } = useToast();
  const { data: letter, isLoading } = useCoverLetter(isDraftMode ? undefined : id);
  const userId = useAuthStore((s) => s.user?.id);
  const jobId = letter?.job_ids?.[0];
  const { data: linkedJob } = useQuery({
    queryKey: ['job', jobId, userId],
    queryFn: async (): Promise<Job | null> => {
      if (!jobId || !userId) return null;
      return apiFetch<Job>(`/api/jobs/${jobId}`);
    },
    enabled: Boolean(jobId) && Boolean(userId),
  });
  const { tier } = useSubscription();
  const { requirePremium, openGoPremium } = useRequirePremium();
  const updateLetter = useUpdateCoverLetter();
  const qc = useQueryClient();

  const { data: preferredClTemplateId = 'cl-classic' } = useQuery({
    queryKey: ['profile-cl-template', userId],
    queryFn: async (): Promise<string> => {
      const profile = await apiFetch<{ preferred_cl_template_id?: string | null }>('/api/account');
      return profile.preferred_cl_template_id ?? 'cl-classic';
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  const [draftContent, setDraftContent] = useState('');
  const [draftTemplateId, setDraftTemplateId] = useState('cl-classic');
  const [draftCompanyName, setDraftCompanyName] = useState('');
  const [draftJobTitle, setDraftJobTitle] = useState('');
  const [draftApplicantName, setDraftApplicantName] = useState('');
  const [draftApplicantRole, setDraftApplicantRole] = useState('');
  const [draftApplicantEmail, setDraftApplicantEmail] = useState('');
  const [draftApplicantPhone, setDraftApplicantPhone] = useState('');
  const [draftApplicantLocation, setDraftApplicantLocation] = useState('');
  const [accent, setAccent] = useState('#2563EB');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAiRewriteModal, setShowAiRewriteModal] = useState(false);
  const [draftClMeta, setDraftClMeta] = useState<CoverLetterOptimiseEditDraft | null>(
    null
  );
  const [draftSaveBusy, setDraftSaveBusy] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);
  const initLetterIdRef = useRef<string | null>(null);
  const jobSyncedForLetterRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewHtmlRef = useRef<string | null>(null);
  const [manualSaveBusy, setManualSaveBusy] = useState(false);
  const draftAutoCreateRef = useRef(false);
  const draftFieldsRef = useRef({
    draftContent: '',
    draftTemplateId: 'cl-classic',
    draftCompanyName: '',
    draftJobTitle: '',
    draftApplicantName: '',
    draftApplicantRole: '',
    draftApplicantEmail: '',
    draftApplicantPhone: '',
    draftApplicantLocation: '',
  });
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  draftFieldsRef.current = {
    draftContent,
    draftTemplateId,
    draftCompanyName,
    draftJobTitle,
    draftApplicantName,
    draftApplicantRole,
    draftApplicantEmail,
    draftApplicantPhone,
    draftApplicantLocation,
  };

  const { data: templates = [] } = useCoverLetterTemplates();

  useEffect(() => {
    if (!isDraftMode) return;
    const payload = useOptimiseEditDraftStore.getState().clEditDraft;
    if (!payload?.content?.trim()) {
      router.replace('/cover-letters/new');
      return;
    }
    setDraftClMeta(payload);
    setDraftContent(payload.content);
    setDraftTemplateId(payload.templateId?.trim() || 'cl-classic');
    setDraftCompanyName(payload.companyName ?? '');
    setDraftJobTitle(payload.jobTitle ?? '');
  }, [isDraftMode, router]);

  useEffect(() => {
    if (!isDraftMode || !draftClMeta?.originalCvId) return;
    const cvId = draftClMeta.originalCvId as string;
    let cancelled = false;
    void (async () => {
      const data = await apiFetch<{
        full_name: string | null;
        professional_title: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
      }>(`/api/cvs/${cvId}`);
      if (cancelled || !data) return;
      setDraftApplicantName((prev) => prev || (data.full_name ?? ''));
      setDraftApplicantRole((prev) => prev || (data.professional_title ?? ''));
      setDraftApplicantEmail((prev) => prev || (data.email ?? ''));
      setDraftApplicantPhone((prev) => prev || (data.phone ?? ''));
      setDraftApplicantLocation((prev) => prev || (data.location ?? ''));
    })();
    return () => {
      cancelled = true;
    };
  }, [isDraftMode, draftClMeta?.originalCvId]);

  useLayoutEffect(() => {
    if (isDraftMode || !letter) return;
    if (initLetterIdRef.current !== letter.id) {
      initLetterIdRef.current = letter.id;
      jobSyncedForLetterRef.current = null;
      const templateId = letter.template_id?.trim() || preferredClTemplateId || 'cl-classic';
      const company = letter.company_name ?? '';
      const jobTitle = letter.job_title ?? '';
      setDraftContent(letter.content ?? '');
      setDraftTemplateId(templateId);
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
      setDraftCompanyName(company);
      setDraftJobTitle(jobTitle);
      setSavedSnapshot(
        serializeCoverLetterEditorState({
          content: letter.content ?? '',
          templateId,
          companyName: company,
          jobTitle,
          applicantName: letter.applicant_name ?? '',
          applicantRole: letter.applicant_role ?? '',
          applicantEmail: letter.applicant_email ?? '',
          applicantPhone: letter.applicant_phone ?? '',
          applicantLocation: letter.applicant_location ?? '',
        })
      );
    }
  }, [letter, preferredClTemplateId, isDraftMode]);

  useEffect(() => {
    if (isDraftMode || !letter || !linkedJob) return;
    if (jobSyncedForLetterRef.current === letter.id) return;
    jobSyncedForLetterRef.current = letter.id;
    setDraftCompanyName(linkedJob.company_name);
    setDraftJobTitle(linkedJob.job_title);
    setSavedSnapshot(
      serializeCoverLetterEditorState({
        content: letter.content ?? '',
        templateId: letter.template_id?.trim() || preferredClTemplateId || 'cl-classic',
        companyName: linkedJob.company_name,
        jobTitle: linkedJob.job_title,
        applicantName: letter.applicant_name ?? '',
        applicantRole: letter.applicant_role ?? '',
        applicantEmail: letter.applicant_email ?? '',
        applicantPhone: letter.applicant_phone ?? '',
        applicantLocation: letter.applicant_location ?? '',
      })
    );
  }, [letter, linkedJob, preferredClTemplateId]);

  useEffect(() => {
    return () => {
      revokePreviewBlob({ urlRef: previewUrlRef, htmlRef: previewHtmlRef });
    };
  }, []);

  const syncDraftFromLetter = useCallback(
    (saved: CoverLetter, companyOverride?: string, jobTitleOverride?: string) => {
      const templateId = saved.template_id?.trim() || preferredClTemplateId || 'cl-classic';
      const company = companyOverride ?? saved.company_name ?? '';
      const jobTitle = jobTitleOverride ?? saved.job_title ?? '';
      setDraftContent(saved.content ?? '');
      setDraftTemplateId(templateId);
      setDraftApplicantName(saved.applicant_name ?? '');
      setDraftApplicantRole(saved.applicant_role ?? '');
      setDraftApplicantEmail(saved.applicant_email ?? '');
      setDraftApplicantPhone(saved.applicant_phone ?? '');
      setDraftApplicantLocation(saved.applicant_location ?? '');
      setDraftCompanyName(company);
      setDraftJobTitle(jobTitle);
      setSavedSnapshot(
        serializeCoverLetterEditorState({
          content: saved.content ?? '',
          templateId,
          companyName: company,
          jobTitle,
          applicantName: saved.applicant_name ?? '',
          applicantRole: saved.applicant_role ?? '',
          applicantEmail: saved.applicant_email ?? '',
          applicantPhone: saved.applicant_phone ?? '',
          applicantLocation: saved.applicant_location ?? '',
        })
      );
    },
    [preferredClTemplateId]
  );

  const refreshPreview = useCallback(
    async (opts?: { showBusy?: boolean }) => {
      const showBusy = opts?.showBusy !== false;
      const applyHtml = async (text: string, ok: boolean) => {
        if (!ok) {
          toast('Preview could not be updated.', 'error');
          return;
        }
        const { url } = await applyPreviewHtmlResponse(text, {
          urlRef: previewUrlRef,
          htmlRef: previewHtmlRef,
        });
        if (url) setPreviewUrl(url);
      };

      if (isDraftMode) {
        if (!draftClMeta) return;
        if (showBusy) setPreviewLoading(true);
        try {
          const res = await fetch('/api/cover-letter/preview-html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: draftContent,
              template_id: draftTemplateId,
              accent_color: accent,
              company_name: draftCompanyName || null,
              job_title: draftJobTitle || null,
              ...(draftClMeta.originalCvId
                ? { original_cv_id: draftClMeta.originalCvId }
                : {}),
              applicant_name: draftApplicantName,
              applicant_role: draftApplicantRole,
              applicant_email: draftApplicantEmail,
              applicant_phone: draftApplicantPhone,
              applicant_location: draftApplicantLocation,
            }),
          });
          const text = await res.text();
          await applyHtml(text, res.ok);
        } finally {
          if (showBusy) setPreviewLoading(false);
        }
        return;
      }
      if (!letter) return;
      if (showBusy) setPreviewLoading(true);
      try {
        const res = await fetch('/api/cover-letter/preview-html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cover_letter_id: letter.id,
            content: draftContent,
            template_id: draftTemplateId,
            accent_color: accent,
            company_name: draftCompanyName,
            job_title: draftJobTitle,
            applicant_name: draftApplicantName,
            applicant_role: draftApplicantRole,
            applicant_email: draftApplicantEmail,
            applicant_phone: draftApplicantPhone,
            applicant_location: draftApplicantLocation,
          }),
        });
        const text = await res.text();
        await applyHtml(text, res.ok);
      } finally {
        if (showBusy) setPreviewLoading(false);
      }
    },
    [
    isDraftMode,
    draftClMeta,
    letter,
    draftContent,
    draftTemplateId,
    accent,
    draftCompanyName,
    draftJobTitle,
    draftApplicantName,
    draftApplicantRole,
    draftApplicantEmail,
    draftApplicantPhone,
    draftApplicantLocation,
    toast,
  ]);

  useEffect(() => {
    if ((!letter && !isDraftMode) || (isDraftMode && !draftClMeta)) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 400);
    return () => window.clearTimeout(t);
  }, [
    letter,
    isDraftMode,
    draftClMeta,
    draftContent,
    draftTemplateId,
    accent,
    draftCompanyName,
    draftJobTitle,
    draftApplicantName,
    draftApplicantRole,
    draftApplicantEmail,
    draftApplicantPhone,
    draftApplicantLocation,
    refreshPreview,
  ]);

  const currentSnapshot = serializeCoverLetterEditorState({
    content: draftContent,
    templateId: draftTemplateId,
    companyName: draftCompanyName,
    jobTitle: draftJobTitle,
    applicantName: draftApplicantName,
    applicantRole: draftApplicantRole,
    applicantEmail: draftApplicantEmail,
    applicantPhone: draftApplicantPhone,
    applicantLocation: draftApplicantLocation,
  });

  const isDirty =
    savedSnapshot !== null ? currentSnapshot !== savedSnapshot : Boolean(isDraftMode && draftClMeta);

  const persistSavedLetter = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (!letter) return false;
      const fields = draftFieldsRef.current;
      const snapshotAtSave = serializeCoverLetterEditorState({
        content: fields.draftContent,
        templateId: fields.draftTemplateId,
        companyName: fields.draftCompanyName,
        jobTitle: fields.draftJobTitle,
        applicantName: fields.draftApplicantName,
        applicantRole: fields.draftApplicantRole,
        applicantEmail: fields.draftApplicantEmail,
        applicantPhone: fields.draftApplicantPhone,
        applicantLocation: fields.draftApplicantLocation,
      });
      const tmpl = templates.find((x) => x.id === fields.draftTemplateId);
      if (
        tmpl &&
        !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
      ) {
        if (!options?.silent) toast('Upgrade your plan to use this template.', 'error');
        return false;
      }
      const resolvedName = resolveClSaveName(
        letter.name,
        fields.draftApplicantName,
        fields.draftJobTitle,
        fields.draftCompanyName
      );
      const silent = options?.silent ?? false;
      if (!silent) setManualSaveBusy(true);
      try {
        const saved = await updateLetter.mutateAsync({
          id: letter.id,
          content: fields.draftContent,
          template_id: fields.draftTemplateId,
          ...(resolvedName ? { name: resolvedName } : {}),
          company_name: fields.draftCompanyName.trim() || null,
          job_title: fields.draftJobTitle.trim() || null,
          applicant_name: fields.draftApplicantName.trim() || null,
          applicant_role: fields.draftApplicantRole.trim() || null,
          applicant_email: fields.draftApplicantEmail.trim() || null,
          applicant_phone: fields.draftApplicantPhone.trim() || null,
          applicant_location: fields.draftApplicantLocation.trim() || null,
        });
        const afterSave = serializeCoverLetterEditorState({
          content: draftFieldsRef.current.draftContent,
          templateId: draftFieldsRef.current.draftTemplateId,
          companyName: draftFieldsRef.current.draftCompanyName,
          jobTitle: draftFieldsRef.current.draftJobTitle,
          applicantName: draftFieldsRef.current.draftApplicantName,
          applicantRole: draftFieldsRef.current.draftApplicantRole,
          applicantEmail: draftFieldsRef.current.draftApplicantEmail,
          applicantPhone: draftFieldsRef.current.draftApplicantPhone,
          applicantLocation: draftFieldsRef.current.draftApplicantLocation,
        });
        if (afterSave === snapshotAtSave) {
          if (silent) {
            setSavedSnapshot(snapshotAtSave);
          } else {
            syncDraftFromLetter(saved, fields.draftCompanyName, fields.draftJobTitle);
          }
        } else {
          setSavedSnapshot(snapshotAtSave);
        }
        if (letter.job_ids?.[0]) {
          await apiFetch(`/api/jobs/${letter.job_ids[0]}`, {
            method: 'PATCH',
            body: JSON.stringify({
              company_name: fields.draftCompanyName.trim() || 'Company',
              job_title: fields.draftJobTitle.trim() || 'Role',
            }),
          });
          if (silent) {
            void qc.invalidateQueries({
              queryKey: ['job', letter.job_ids[0], userId],
              refetchType: 'none',
            });
          } else {
            void qc.invalidateQueries({
              queryKey: ['job', letter.job_ids[0], userId],
            });
          }
        }
        if (!options?.silent) toast('Cover letter saved.', 'success');
        return true;
      } catch (e) {
        console.error('[cover-letter save]', e);
        if (!options?.silent) {
          toast(e instanceof Error ? e.message : 'Could not save.', 'error');
        }
        return false;
      } finally {
        if (!silent) setManualSaveBusy(false);
      }
    },
    [
      letter,
      templates,
      tier,
      toast,
      updateLetter,
      userId,
      qc,
      syncDraftFromLetter,
    ]
  );

  const handleSave = useCallback(
    async (options?: { navigateAfterDraft?: boolean; silent?: boolean }): Promise<boolean> => {
      if (isDraftMode) {
        if (!draftClMeta) return false;
        const fields = draftFieldsRef.current;
        const tmpl = templates.find((x) => x.id === fields.draftTemplateId);
        if (
          tmpl &&
          !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
        ) {
          if (!options?.silent) toast('Upgrade your plan to use this template.', 'error');
          return false;
        }
        setDraftSaveBusy(true);
        try {
          const name = defaultCoverLetterDisplayName({
            applicantName: fields.draftApplicantName,
            jobTitle: fields.draftJobTitle,
            companyName: fields.draftCompanyName,
          });
          const res = await fetch('/api/cover-letters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              content: fields.draftContent,
              tone: draftClMeta.tone ?? 'professional',
              length: draftClMeta.length ?? 'medium',
              template_id: fields.draftTemplateId,
              specific_emphasis: draftClMeta.emphasis?.trim() || null,
              company_name: fields.draftCompanyName.trim() || null,
              job_title: fields.draftJobTitle.trim() || null,
              applicant_name: fields.draftApplicantName.trim() || null,
              applicant_role: fields.draftApplicantRole.trim() || null,
              applicant_email: fields.draftApplicantEmail.trim() || null,
              applicant_phone: fields.draftApplicantPhone.trim() || null,
              applicant_location: fields.draftApplicantLocation.trim() || null,
              job_ids: draftClMeta.savedJobId ? [draftClMeta.savedJobId] : [],
              source_type: draftClMeta.sourceType ?? null,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            console.error('cover-letters POST', errText);
            if (!options?.silent) toast('Could not save cover letter.', 'error');
            return false;
          }
          const created = (await res.json()) as { id: string };
          useOptimiseEditDraftStore.getState().setClEditDraft(null);
          const d = useOptimiseDraftStore.getState().draft;
          if (d) {
            useOptimiseDraftStore.getState().setDraft({
              ...d,
              savedCoverLetterId: created.id,
            });
          }
          void qc.invalidateQueries({ queryKey: ['cover-letters'] });
          if (!options?.silent) toast('Cover letter saved.', 'success');
          if (options?.navigateAfterDraft === false) {
            return true;
          }
          router.replace(`/cover-letters/${created.id}`);
          return true;
        } catch (e) {
          console.error(e);
          if (!options?.silent) toast('Could not save.', 'error');
          return false;
        } finally {
          setDraftSaveBusy(false);
        }
      }
      return persistSavedLetter(options);
    },
    [
      isDraftMode,
      draftClMeta,
      templates,
      tier,
      toast,
      qc,
      router,
      persistSavedLetter,
    ]
  );

  useEffect(() => {
    if (!isDraftMode || !draftClMeta || draftAutoCreateRef.current) return;
    draftAutoCreateRef.current = true;
    void handleSave({ silent: true });
  }, [isDraftMode, draftClMeta, handleSave]);

  const autosaveEnabled = Boolean(!isDraftMode && letter && savedSnapshot !== null);
  const { hasPendingSave, flush, cancel, status: autosaveStatus } = useDebouncedAutosave({
    isDirty,
    enabled: autosaveEnabled && !draftSaveBusy && !manualSaveBusy,
    save: () => handleSave({ silent: true }),
    revision: isDirty ? currentSnapshot : 0,
    quiet: true,
  });

  const hasUnsavedWork =
    isDirty || hasPendingSave || draftSaveBusy || manualSaveBusy;

  const handleBackClick = useCallback(() => {
    if (hasUnsavedWork) {
      setLeaveModalOpen(true);
      return;
    }
    router.push('/cover-letters');
  }, [hasUnsavedWork, router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedWork]);

  const handleDiscardLeave = useCallback(() => {
    cancel();
    setLeaveModalOpen(false);
    if (isDraftMode) {
      useOptimiseEditDraftStore.getState().setClEditDraft(null);
      const optim = useOptimiseDraftStore.getState().draft;
      router.push(optim ? '/cv/optimise/result' : '/cover-letters');
      return;
    }
    if (letter) {
      const company = linkedJob?.company_name ?? letter.company_name ?? '';
      const jobTitle = linkedJob?.job_title ?? letter.job_title ?? '';
      setDraftContent(letter.content ?? '');
      setDraftTemplateId(letter.template_id?.trim() || preferredClTemplateId || 'cl-classic');
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
      setDraftCompanyName(company);
      setDraftJobTitle(jobTitle);
      setSavedSnapshot(
        serializeCoverLetterEditorState({
          content: letter.content ?? '',
          templateId: letter.template_id?.trim() || preferredClTemplateId || 'cl-classic',
          companyName: company,
          jobTitle,
          applicantName: letter.applicant_name ?? '',
          applicantRole: letter.applicant_role ?? '',
          applicantEmail: letter.applicant_email ?? '',
          applicantPhone: letter.applicant_phone ?? '',
          applicantLocation: letter.applicant_location ?? '',
        })
      );
    }
    router.push('/cover-letters');
  }, [isDraftMode, letter, linkedJob, preferredClTemplateId, router]);

  const handleSaveAndLeave = useCallback(async () => {
    setLeaveSaving(true);
    try {
      const ok = await flush();
      if (ok) {
        setLeaveModalOpen(false);
        router.push('/cover-letters');
      }
    } finally {
      setLeaveSaving(false);
    }
  }, [flush, router]);

  async function performExport(format: ExportFormat = 'pdf') {
    if (!letter) return;
    setExportingPdf(true);
    try {
      const result = await exportCoverLetter(
        {
          id: letter.id,
          templateId: draftTemplateId,
          content: draftContent,
          accent_color: accent,
          company_name: draftCompanyName,
          job_title: draftJobTitle,
          applicant_name: draftApplicantName,
          applicant_role: draftApplicantRole,
          applicant_email: draftApplicantEmail,
          applicant_phone: draftApplicantPhone,
          applicant_location: draftApplicantLocation,
        },
        format
      );
      if (result === 'upgrade_required') {
        openGoPremium(format === 'docx' ? 'docx' : 'export');
      } else if (result === 'error') {
        toast('Export failed.', 'error');
      }
    } finally {
      setExportingPdf(false);
    }
  }

  function handleExport(format: ExportFormat = 'pdf') {
    if (isDraftMode) {
      toast('Save your cover letter first to export.', 'error');
      return;
    }
    if (!letter) return;
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

  if ((!isDraftMode && isLoading) || (isDraftMode && !draftClMeta)) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }
  if (!isDraftMode && !letter) {
    return <p className="text-sm">Not found.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <UnsavedLeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onDiscard={handleDiscardLeave}
        onSaveAndLeave={() => void handleSaveAndLeave()}
        saving={leaveSaving}
        entityLabel="cover letter"
      />
      {isDraftMode ? (
        <div className="rounded-xl border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 px-4 py-3 text-sm text-[var(--color-text-primary)]">
          You are editing an unsaved draft from optimise. Save to store this letter and enable PDF export.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleBackClick}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Back
        </button>
        {!isDraftMode ? (
          <span className="text-xs text-[var(--color-muted)]">
            {manualSaveBusy
              ? 'Saving…'
              : autosaveStatus === 'error'
                ? "Couldn't save"
                : isDirty
                  ? 'Unsaved changes'
                  : 'Saved'}
          </span>
        ) : draftSaveBusy ? (
          <span className="text-xs text-[var(--color-muted)]">Saving…</span>
        ) : isDirty ? (
          <span className="text-xs text-[var(--color-muted)]">Unsaved changes</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {linkedJob?.company_name ||
              draftCompanyName ||
              letter?.name ||
              'Cover letter'}
          </h1>
          <p className="text-[var(--color-muted)]">
            {linkedJob?.job_title || draftJobTitle || letter?.applicant_role || ''}
          </p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {letter ? formatDate(letter.created_at) : 'Unsaved draft'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isDraftMode && letter?.ats_score != null ? (
            <Badge variant="success">ATS {letter.ats_score}</Badge>
          ) : null}
          <ExportMenu
            busyFormat={exportingPdf ? 'pdf' : null}
            disabled={isDraftMode || !letter}
            canExport={canAccessFeature(tier, 'pdfExport')}
            canDocx={canAccessFeature(tier, 'docxExport')}
            onExport={(format) => void handleExport(format)}
          />
          <Button
            variant="primary"
            size="sm"
            loading={isDraftMode ? draftSaveBusy : updateLetter.isPending}
            disabled={!isDirty && !hasPendingSave}
            onClick={() => void flush()}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
              Choose a layout
            </p>
            <p className="mb-3 text-xs text-[var(--color-muted)]">
              The live preview updates when you pick a template.
            </p>
            <CoverLetterTemplatePicker
              templates={templates}
              selectedId={draftTemplateId}
              onSelect={setDraftTemplateId}
              accent={accent}
              userTier={tier}
              columns="compact"
            />
          </div>
          <p className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
            <LayoutTemplate className="h-3.5 w-3.5" />
            PDF export uses this layout.{' '}
            <Link
              href="/cover-letters/templates"
              className="text-[var(--color-primary)] hover:underline"
            >
              Browse all templates
            </Link>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Your name"
              value={draftApplicantName}
              onChange={(e) => setDraftApplicantName(e.target.value)}
            />
            <Input
              label="Your role"
              value={draftApplicantRole}
              onChange={(e) => setDraftApplicantRole(e.target.value)}
            />
            <Input
              label="Company"
              value={draftCompanyName}
              onChange={(e) => setDraftCompanyName(e.target.value)}
            />
            <Input
              label="Job title"
              value={draftJobTitle}
              onChange={(e) => setDraftJobTitle(e.target.value)}
            />
            <Input
              label="Email"
              value={draftApplicantEmail}
              onChange={(e) => setDraftApplicantEmail(e.target.value)}
            />
            <Input
              label="Phone"
              value={draftApplicantPhone}
              onChange={(e) => setDraftApplicantPhone(e.target.value)}
            />
            <Input
              label="Location"
              value={draftApplicantLocation}
              onChange={(e) => setDraftApplicantLocation(e.target.value)}
              className="sm:col-span-2"
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-[var(--color-secondary)]">
              Accent (PDF)
            </span>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                  aria-label={`Accent ${c}`}
                />
              ))}
            </div>
          </div>

          <Textarea
            label="Letter text"
            name="content"
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            className="min-h-[280px] font-sans text-sm leading-relaxed"
            rows={14}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <CvAtsPolishButton
              disabled={!draftContent.trim()}
              onClick={() => setShowAiRewriteModal(true)}
            />
          </div>
        </div>

        <div className="lg:sticky lg:top-20">
          <p className="mb-2 text-sm font-medium text-[var(--color-secondary)]">
            Print preview
          </p>
          <p className="mb-3 text-xs text-[var(--color-muted)]">
            Matches the PDF (including footer on Free plans).
          </p>
          <div className="max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 shadow-sm">
            <CoverLetterPrintPreviewFrame
              src={previewUrl}
              title="Cover letter print preview"
              isLoading={previewLoading}
            />
          </div>
        </div>
      </div>
      <CVRewriteWithAIModal
        isOpen={showAiRewriteModal}
        onClose={() => setShowAiRewriteModal(false)}
        section="Cover letter"
        inputLabel="Letter text"
        sourceText={draftContent}
        extraContext={`${linkedJob?.job_title || ''} ${linkedJob?.company_name || ''}`.trim()}
        onSelectSuggestion={(value) => setDraftContent(value)}
      />
    </div>
  );
}
