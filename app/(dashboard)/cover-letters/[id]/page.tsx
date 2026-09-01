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

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

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
      setDraftContent(letter.content ?? '');
      setDraftTemplateId(letter.template_id?.trim() || preferredClTemplateId || 'cl-classic');
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
      setDraftCompanyName(letter.company_name ?? '');
      setDraftJobTitle(letter.job_title ?? '');
    }
  }, [letter, preferredClTemplateId, isDraftMode]);

  useEffect(() => {
    if (isDraftMode || !letter || !linkedJob) return;
    if (jobSyncedForLetterRef.current === letter.id) return;
    jobSyncedForLetterRef.current = letter.id;
    setDraftCompanyName(linkedJob.company_name);
    setDraftJobTitle(linkedJob.job_title);
  }, [letter, linkedJob]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const syncDraftFromLetter = useCallback((saved: CoverLetter) => {
    setDraftContent(saved.content ?? '');
    setDraftTemplateId(saved.template_id?.trim() || preferredClTemplateId || 'cl-classic');
    setDraftApplicantName(saved.applicant_name ?? '');
    setDraftApplicantRole(saved.applicant_role ?? '');
    setDraftApplicantEmail(saved.applicant_email ?? '');
    setDraftApplicantPhone(saved.applicant_phone ?? '');
    setDraftApplicantLocation(saved.applicant_location ?? '');
    setDraftCompanyName(saved.company_name ?? '');
    setDraftJobTitle(saved.job_title ?? '');
  }, [preferredClTemplateId]);

  const refreshPreview = useCallback(async () => {
    if (isDraftMode) {
      if (!draftClMeta) return;
      setPreviewLoading(true);
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
        if (!res.ok) {
          toast('Preview could not be updated.', 'error');
          return;
        }
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    if (!letter) return;
    setPreviewLoading(true);
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
      if (!res.ok) {
        toast('Preview could not be updated.', 'error');
        return;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } finally {
      setPreviewLoading(false);
    }
  }, [
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

  const isDirty = Boolean(
    (isDraftMode && draftClMeta && draftContent.trim().length > 0) ||
      (!isDraftMode &&
        letter &&
        (draftContent !== (letter.content ?? '') ||
          draftTemplateId !== (letter.template_id?.trim() || 'cl-classic') ||
          draftCompanyName !== (linkedJob?.company_name ?? letter.company_name ?? '') ||
          draftJobTitle !== (linkedJob?.job_title ?? letter.job_title ?? '') ||
          draftApplicantName !== (letter.applicant_name ?? '') ||
          draftApplicantRole !== (letter.applicant_role ?? '') ||
          draftApplicantEmail !== (letter.applicant_email ?? '') ||
          draftApplicantPhone !== (letter.applicant_phone ?? '') ||
          draftApplicantLocation !== (letter.applicant_location ?? '')))
  );

  const persistSavedLetter = useCallback(
    async (options?: { silent?: boolean }): Promise<boolean> => {
      if (!letter) return false;
      const tmpl = templates.find((x) => x.id === draftTemplateId);
      if (
        tmpl &&
        !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
      ) {
        if (!options?.silent) toast('Upgrade your plan to use this template.', 'error');
        return false;
      }
      try {
        const saved = await updateLetter.mutateAsync({
          id: letter.id,
          content: draftContent,
          template_id: draftTemplateId,
          company_name: draftCompanyName.trim() || null,
          job_title: draftJobTitle.trim() || null,
          applicant_name: draftApplicantName.trim() || null,
          applicant_role: draftApplicantRole.trim() || null,
          applicant_email: draftApplicantEmail.trim() || null,
          applicant_phone: draftApplicantPhone.trim() || null,
          applicant_location: draftApplicantLocation.trim() || null,
        });
        syncDraftFromLetter(saved);
        if (letter.job_ids?.[0]) {
          await apiFetch(`/api/jobs/${letter.job_ids[0]}`, {
            method: 'PATCH',
            body: JSON.stringify({
              company_name: draftCompanyName.trim() || 'Company',
              job_title: draftJobTitle.trim() || 'Role',
            }),
          });
          void qc.invalidateQueries({
            queryKey: ['job', letter.job_ids[0], userId],
          });
        }
        if (!options?.silent) toast('Cover letter saved.', 'success');
        return true;
      } catch (e) {
        console.error('[cover-letter save]', e);
        if (!options?.silent) {
          toast(e instanceof Error ? e.message : 'Could not save.', 'error');
        }
        return false;
      }
    },
    [
      letter,
      templates,
      draftTemplateId,
      tier,
      toast,
      updateLetter,
      draftContent,
      draftApplicantName,
      draftApplicantRole,
      draftApplicantEmail,
      draftApplicantPhone,
      draftApplicantLocation,
      draftCompanyName,
      draftJobTitle,
      userId,
      qc,
      syncDraftFromLetter,
    ]
  );

  async function handleSave(options?: { navigateAfterDraft?: boolean }): Promise<boolean> {
    if (isDraftMode) {
      if (!draftClMeta) return false;
      const tmpl = templates.find((x) => x.id === draftTemplateId);
      if (
        tmpl &&
        !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
      ) {
        toast('Upgrade your plan to use this template.', 'error');
        return false;
      }
      setDraftSaveBusy(true);
      try {
        const res = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: draftContent,
            tone: draftClMeta.tone ?? 'professional',
            length: draftClMeta.length ?? 'medium',
            template_id: draftTemplateId,
            specific_emphasis: draftClMeta.emphasis?.trim() || null,
            company_name: draftCompanyName.trim() || null,
            job_title: draftJobTitle.trim() || null,
            applicant_name: draftApplicantName.trim() || null,
            applicant_role: draftApplicantRole.trim() || null,
            applicant_email: draftApplicantEmail.trim() || null,
            applicant_phone: draftApplicantPhone.trim() || null,
            applicant_location: draftApplicantLocation.trim() || null,
            job_ids: draftClMeta.savedJobId ? [draftClMeta.savedJobId] : [],
            source_type: draftClMeta.sourceType ?? null,
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('cover-letters POST', errText);
          toast('Could not save cover letter.', 'error');
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
        toast('Cover letter saved.', 'success');
        if (options?.navigateAfterDraft === false) {
          return true;
        }
        router.replace(`/cover-letters/${created.id}`);
        return true;
      } catch (e) {
        console.error(e);
        toast('Could not save.', 'error');
        return false;
      } finally {
        setDraftSaveBusy(false);
      }
    }
    return persistSavedLetter();
  }

  const handleBackClick = useCallback(() => {
    if (isDirty) {
      setLeaveModalOpen(true);
      return;
    }
    router.push('/cover-letters');
  }, [isDirty, router]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleDiscardLeave = useCallback(() => {
    setLeaveModalOpen(false);
    if (isDraftMode) {
      useOptimiseEditDraftStore.getState().setClEditDraft(null);
      const optim = useOptimiseDraftStore.getState().draft;
      router.push(optim ? '/cv/optimise/result' : '/cover-letters');
      return;
    }
    if (letter) {
      setDraftContent(letter.content ?? '');
      setDraftTemplateId(letter.template_id?.trim() || preferredClTemplateId || 'cl-classic');
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
      setDraftCompanyName(linkedJob?.company_name ?? letter.company_name ?? '');
      setDraftJobTitle(linkedJob?.job_title ?? letter.job_title ?? '');
    }
    router.push('/cover-letters');
  }, [isDraftMode, letter, linkedJob, preferredClTemplateId, router]);

  const handleSaveAndLeave = useCallback(async () => {
    setLeaveSaving(true);
    try {
      const ok = await handleSave({ navigateAfterDraft: false });
      if (ok) {
        setLeaveModalOpen(false);
        router.push('/cover-letters');
      }
    } finally {
      setLeaveSaving(false);
    }
  }, [
    isDraftMode,
    draftClMeta,
    templates,
    draftTemplateId,
    tier,
    draftContent,
    draftApplicantName,
    draftApplicantRole,
    draftApplicantEmail,
    draftApplicantPhone,
    draftApplicantLocation,
    qc,
    toast,
    router,
    persistSavedLetter,
  ]);

  async function handleExport(format: ExportFormat = 'pdf') {
    if (isDraftMode) {
      toast('Save your cover letter first to export.', 'error');
      return;
    }
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
        toast('DOCX export is a Pro feature. Upgrade to unlock.', 'error');
      } else if (result === 'error') {
        toast('Export failed.', 'error');
      }
    } finally {
      setExportingPdf(false);
    }
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
            {updateLetter.isPending
              ? 'Saving…'
              : isDirty
                ? 'Unsaved changes'
                : 'Saved'}
          </span>
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
            canDocx={canAccessFeature(tier, 'docxExport')}
            onExport={(format) => void handleExport(format)}
          />
          <Button
            variant="primary"
            size="sm"
            loading={isDraftMode ? draftSaveBusy : updateLetter.isPending}
            disabled={!isDirty}
            onClick={() => void handleSave()}
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
          <div className="max-h-[min(70vh,720px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--color-border)] bg-slate-50 p-3 shadow-sm">
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
