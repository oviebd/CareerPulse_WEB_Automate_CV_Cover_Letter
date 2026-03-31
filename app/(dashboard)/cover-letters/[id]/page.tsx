'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
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

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

export default function CoverLetterDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { toast } = useToast();
  const { data: letter, isLoading } = useCoverLetter(id);
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
  const initLetterIdRef = useRef<string | null>(null);
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

  useLayoutEffect(() => {
    if (!letter) return;
    if (initLetterIdRef.current !== letter.id) {
      initLetterIdRef.current = letter.id;
      setDraftContent(letter.content);
      setDraftTemplateId(letter.template_id?.trim() || 'cl-classic');
      setDraftCompanyName(letter.company_name ?? '');
      setDraftJobTitle(letter.job_title ?? '');
      setDraftApplicantName(letter.applicant_name ?? '');
      setDraftApplicantRole(letter.applicant_role ?? '');
      setDraftApplicantEmail(letter.applicant_email ?? '');
      setDraftApplicantPhone(letter.applicant_phone ?? '');
      setDraftApplicantLocation(letter.applicant_location ?? '');
    }
  }, [letter]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const refreshPreview = useCallback(async () => {
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
  ]);

  useEffect(() => {
    if (!letter) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 400);
    return () => window.clearTimeout(t);
  }, [
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
    refreshPreview,
  ]);

  const isDirty =
    letter &&
    (draftContent !== letter.content ||
      draftTemplateId !== (letter.template_id?.trim() || 'cl-classic') ||
      draftCompanyName !== (letter.company_name ?? '') ||
      draftJobTitle !== (letter.job_title ?? '') ||
      draftApplicantName !== (letter.applicant_name ?? '') ||
      draftApplicantRole !== (letter.applicant_role ?? '') ||
      draftApplicantEmail !== (letter.applicant_email ?? '') ||
      draftApplicantPhone !== (letter.applicant_phone ?? '') ||
      draftApplicantLocation !== (letter.applicant_location ?? ''));

  async function handleSave() {
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
        company_name: draftCompanyName.trim() || null,
        job_title: draftJobTitle.trim() || null,
        applicant_name: draftApplicantName.trim() || null,
        applicant_role: draftApplicantRole.trim() || null,
        applicant_email: draftApplicantEmail.trim() || null,
        applicant_phone: draftApplicantPhone.trim() || null,
        applicant_location: draftApplicantLocation.trim() || null,
      });
      toast('Cover letter saved.', 'success');
    } catch {
      toast('Could not save.', 'error');
    }
  }

  async function handleExportPdf() {
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

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }
  if (!letter) {
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
      <Link href="/cover-letters" className="text-sm text-[var(--color-primary)]">
        ← Back
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {letter.company_name || 'Company'}
          </h1>
          <p className="text-[var(--color-muted)]">{letter.job_title}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {formatDate(letter.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {letter.ats_score != null ? (
            <Badge variant="success">ATS {letter.ats_score}</Badge>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleExportPdf()}
          >
            Export PDF
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={updateLetter.isPending}
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
        extraContext={`${letter.job_title || ''} ${letter.company_name || ''}`.trim()}
        onSelectSuggestion={(value) => setDraftContent(value)}
      />
    </div>
  );
}
