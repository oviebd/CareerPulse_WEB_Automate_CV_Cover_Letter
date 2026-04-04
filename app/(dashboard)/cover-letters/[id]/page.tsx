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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { CVRewriteWithAIModal } from '@/components/cv/CVRewriteWithAIModal';
import { CvAtsPolishButton } from '@/components/cv/CvAtsPolishButton';
import { CoverLetterPrintPreviewFrame } from '@/components/cover-letter/CoverLetterPrintPreviewFrame';
import {
  useCoverLetter,
  useUpdateCoverLetter,
} from '@/hooks/useCoverLetters';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { canUseTemplate } from '@/lib/subscription';
import { formatDate } from '@/lib/utils';
import type { CVTemplate, SubscriptionTier } from '@/types';
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Job) ?? null;
    },
    enabled: Boolean(jobId) && Boolean(userId),
  });
  const { tier } = useSubscription();
  const updateLetter = useUpdateCoverLetter();

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
  const initLetterIdRef = useRef<string | null>(null);
  const jobSyncedForLetterRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ['cover-letter-templates'],
    queryFn: async (): Promise<CVTemplate[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('cv_templates')
        .select('*')
        .eq('type', 'cover_letter')
        .order('sort_order');
      return (data ?? []) as CVTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!isDraftMode) return;
    const payload = useOptimiseEditDraftStore.getState().clEditDraft;
    if (!payload?.content?.trim() || !payload.originalCvId) {
      router.replace('/cv/optimise/result');
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
    const supabase = createClient();
    const cvId = draftClMeta.originalCvId;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('cvs')
        .select('full_name, professional_title, email, phone, location')
        .eq('id', cvId)
        .maybeSingle();
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
      setDraftTemplateId(letter.template_id?.trim() || 'cl-classic');
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
      setDraftCompanyName('');
      setDraftJobTitle('');
    }
  }, [letter]);

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

  const refreshPreview = useCallback(async () => {
    if (isDraftMode) {
      if (!draftClMeta?.originalCvId) return;
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
            original_cv_id: draftClMeta.originalCvId,
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

  const isDirty =
    (isDraftMode && draftClMeta && draftContent.trim().length > 0) ||
    (!isDraftMode &&
      letter &&
      (draftContent !== (letter.content ?? '') ||
        draftTemplateId !== (letter.template_id?.trim() || 'cl-classic') ||
        draftCompanyName !== (linkedJob?.company_name ?? '') ||
        draftJobTitle !== (linkedJob?.job_title ?? '') ||
        draftApplicantName !== (letter.applicant_name ?? '') ||
        draftApplicantRole !== (letter.applicant_role ?? '') ||
        draftApplicantEmail !== (letter.applicant_email ?? '') ||
        draftApplicantPhone !== (letter.applicant_phone ?? '') ||
        draftApplicantLocation !== (letter.applicant_location ?? '')));

  async function handleSave() {
    if (isDraftMode) {
      if (!draftClMeta) return;
      const tmpl = templates.find((x) => x.id === draftTemplateId);
      if (
        tmpl &&
        !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
      ) {
        toast('Upgrade your plan to use this template.', 'error');
        return;
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
            applicant_name: draftApplicantName.trim() || null,
            applicant_role: draftApplicantRole.trim() || null,
            applicant_email: draftApplicantEmail.trim() || null,
            applicant_phone: draftApplicantPhone.trim() || null,
            applicant_location: draftApplicantLocation.trim() || null,
            job_ids: draftClMeta.savedJobId ? [draftClMeta.savedJobId] : [],
          }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error('cover-letters POST', errText);
          toast('Could not save cover letter.', 'error');
          return;
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
        toast('Cover letter saved.', 'success');
        router.replace(`/cover-letters/${created.id}`);
      } catch (e) {
        console.error(e);
        toast('Could not save.', 'error');
      } finally {
        setDraftSaveBusy(false);
      }
      return;
    }
    if (!letter) return;
    const tmpl = templates.find((x) => x.id === draftTemplateId);
    if (
      tmpl &&
      !canUseTemplate(tmpl.available_tiers as SubscriptionTier[], tier)
    ) {
      toast('Upgrade your plan to use this template.', 'error');
      return;
    }
    try {
      await updateLetter.mutateAsync({
        id: letter.id,
        content: draftContent,
        template_id: draftTemplateId,
        applicant_name: draftApplicantName.trim() || null,
        applicant_role: draftApplicantRole.trim() || null,
        applicant_email: draftApplicantEmail.trim() || null,
        applicant_phone: draftApplicantPhone.trim() || null,
        applicant_location: draftApplicantLocation.trim() || null,
      });
      if (letter.job_ids?.[0]) {
        const supabase = createClient();
        const { error: jobErr } = await supabase
          .from('jobs')
          .update({
            company_name: draftCompanyName.trim() || 'Company',
            job_title: draftJobTitle.trim() || 'Role',
          })
          .eq('id', letter.job_ids[0])
          .eq('user_id', userId ?? '');
        if (jobErr) throw jobErr;
      }
      toast('Cover letter saved.', 'success');
    } catch {
      toast('Could not save.', 'error');
    }
  }

  async function handleExportPdf() {
    if (isDraftMode) {
      toast('Save your cover letter first to export PDF.', 'error');
      return;
    }
    if (!letter) return;
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cover_letter',
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
      }),
    });
    const j = (await res.json()) as { pdfUrl?: string; error?: string };
    if (j.pdfUrl) {
      window.open(j.pdfUrl, '_blank');
      return;
    }
    toast(j.error === 'invalid_template' ? 'This template is not available.' : 'Export failed.', 'error');
  }

  if ((!isDraftMode && isLoading) || (isDraftMode && !draftClMeta)) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }
  if (!isDraftMode && !letter) {
    return <p className="text-sm">Not found.</p>;
  }

  const templateOptions = templates.map((t) => {
    const allowed = canUseTemplate(
      t.available_tiers as SubscriptionTier[],
      tier
    );
    return {
      value: t.id,
      label: `${t.name}${allowed ? '' : ' (plan)'}`,
      disabled: !allowed,
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {isDraftMode ? (
        <div className="rounded-xl border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/10 px-4 py-3 text-sm text-[var(--color-text-primary)]">
          You are editing an unsaved draft from optimise. Save to store this letter and enable PDF export.
        </div>
      ) : null}
      <Link href="/cover-letters" className="text-sm text-[var(--color-primary)]">
        ← Back
      </Link>
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
          <Button
            variant="secondary"
            size="sm"
            disabled={isDraftMode}
            onClick={() => void handleExportPdf()}
          >
            Export PDF
          </Button>
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
          <Select
            label="Template"
            name="template_id"
            value={draftTemplateId}
            onChange={(e) => setDraftTemplateId(e.target.value)}
            options={templateOptions}
          />
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
          <div className="relative h-[70vh] overflow-auto rounded-xl border border-[var(--color-border)] bg-slate-50 shadow-sm">
            <CoverLetterPrintPreviewFrame
              src={previewUrl}
              title="Cover letter print preview"
              isLoading={previewLoading}
              containerHeight="70vh"
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
