'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import {
  useJobSpecificCV,
  useUpdateJobSpecificCV,
} from '@/hooks/useJobSpecificCVs';
import { useSubscription } from '@/hooks/useSubscription';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

function previewPayloadFromCVData(d: CVData): Record<string, unknown> {
  return {
    full_name: d.full_name,
    professional_title: d.professional_title,
    email: d.email,
    phone: d.phone,
    location: d.location,
    linkedin_url: d.linkedin_url,
    portfolio_url: d.portfolio_url,
    website_url: d.website_url,
    address: d.address ?? null,
    photo_url: d.photo_url ?? null,
    summary: d.summary,
    section_visibility: {},
    experience: d.experience ?? [],
    education: d.education ?? [],
    skills: d.skills ?? [],
    projects: d.projects ?? [],
    certifications: d.certifications ?? [],
    languages: d.languages ?? [],
    referrals: (d.referrals ?? []).slice(0, 2),
    awards: d.awards ?? [],
  };
}

export default function JobCVEditPage() {
  const { id } = useParams<{ id: string }>();
  const { data: jobCV, isLoading } = useJobSpecificCV(id);
  const { update, isSaving, lastSaved } = useUpdateJobSpecificCV(id);
  const [showJD, setShowJD] = useState(false);

  const { tier } = useSubscription();

  const [draft, setDraft] = useState<CVData | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState<string>('#2563EB');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);

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

  const templateMeta = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  );
  const allowed = useMemo(() => {
    if (!templateMeta) return false;
    return canUseTemplate(
      templateMeta.available_tiers as SubscriptionTier[],
      tier
    );
  }, [templateMeta, tier]);

  useEffect(() => {
    if (!jobCV || draft) return;
    setDraft({
      full_name: jobCV.full_name ?? null,
      professional_title: jobCV.professional_title ?? null,
      email: jobCV.email ?? null,
      phone: jobCV.phone ?? null,
      location: jobCV.location ?? null,
      linkedin_url: jobCV.linkedin_url ?? null,
      portfolio_url: jobCV.portfolio_url ?? null,
      website_url: jobCV.website_url ?? null,
      address: null,
      photo_url: null,
      summary: jobCV.summary ?? null,
      experience: jobCV.experience ?? [],
      education: jobCV.education ?? [],
      skills: jobCV.skills ?? [],
      projects: jobCV.projects ?? [],
      certifications: jobCV.certifications ?? [],
      languages: jobCV.languages ?? [],
      awards: jobCV.awards ?? [],
      referrals: [],
    });
    setSelectedTemplateId(jobCV.preferred_template_id ?? 'classic');
    setAccent(jobCV.accent_color ?? '#6C63FF');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCV]);

  const refreshPreview = useCallback(async () => {
    if (!draft || !selectedTemplateId) return;
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/cv/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          accent_color: accent,
          cv: previewPayloadFromCVData(draft),
        }),
      });
      if (!res.ok) {
        setPreviewHtml('');
        return;
      }
      setPreviewHtml(await res.text());
    } finally {
      setPreviewBusy(false);
    }
  }, [draft, selectedTemplateId, accent]);

  useEffect(() => {
    if (!draft || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 450);
    return () => window.clearTimeout(t);
  }, [draft, refreshPreview, templatesLoading]);

  const handleChange = useCallback(
    (data: CVData) => {
      setDraft(data);
      update({
        full_name: data.full_name,
        professional_title: data.professional_title,
        email: data.email,
        phone: data.phone,
        location: data.location,
        linkedin_url: data.linkedin_url,
        portfolio_url: data.portfolio_url,
        website_url: data.website_url,
        summary: data.summary,
        experience: data.experience,
        education: data.education,
        skills: data.skills,
        projects: data.projects,
        certifications: data.certifications,
        languages: data.languages,
        awards: data.awards,
        preferred_template_id: selectedTemplateId,
        accent_color: accent,
      });
    },
    [update, selectedTemplateId, accent]
  );

  if (isLoading || !draft || !jobCV) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    );
  }

  const keywords = jobCV.keywords_added ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 lg:space-y-6">
      {/* Job CV banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-blue-900">
              Job CV for {jobCV.job_title}
              {jobCV.company_name ? ` at ${jobCV.company_name}` : ''}
            </h2>
            {jobCV.ai_changes_summary && (
              <p className="mt-1 text-sm text-blue-800">
                {jobCV.ai_changes_summary}
              </p>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
            onClick={() => setShowJD(!showJD)}
          >
            {showJD ? 'Hide' : 'View'} Job Description
          </button>
        </div>
        {showJD && (
          <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">
            {jobCV.job_description}
          </pre>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/cv/job-specific"
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-secondary)]"
          >
            &larr; All Job CVs
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {isSaving
              ? 'Saving...'
              : lastSaved
                ? `Saved ${lastSaved.toLocaleTimeString()}`
                : ''}
          </span>
          <Link
            href={`/cv/templates?job_cv_id=${id}`}
          >
            <Button variant="primary" size="sm">
              Export PDF
            </Button>
          </Link>
        </div>
      </div>

      {/* Editor */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)]">
        <Card className="p-4 sm:p-6">
          <CVEditorPanel
            value={draft}
            onChange={handleChange}
            highlightedKeywords={keywords}
          />
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Template
            </p>
            <Select
              label={templatesLoading ? 'Loading…' : 'Choose layout'}
              value={selectedTemplateId}
              disabled={templatesLoading || !templates.length}
              options={templates.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedTemplateId(next);
                update({ preferred_template_id: next, accent_color: accent });
              }}
            />
            {!templatesLoading && !allowed ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                You can preview this layout with your data here. Upgrade to export
                this template.
              </p>
            ) : null}
          </div>

          <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-[var(--color-muted)]">Accent:</span>
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
                  style={{ background: c }}
                  onClick={() => {
                    setAccent(c);
                    update({
                      accent_color: c,
                      preferred_template_id: selectedTemplateId,
                    });
                  }}
                  aria-label={`Set accent ${c}`}
                />
              ))}
            </div>
          </FeatureGate>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Live preview (A4)
            </p>
            <div
              className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-slate-100 shadow-inner"
              style={{ aspectRatio: '210 / 297' }}
            >
              {previewBusy ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
                  Updating preview…
                </div>
              ) : null}
              {previewHtml ? (
                <iframe
                  title="CV preview"
                  className="h-[1123px] w-[794px] max-w-none origin-top-left scale-[0.55] sm:scale-[0.58] md:scale-[0.6]"
                  style={{ transformOrigin: 'top left' }}
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin allow-popups"
                />
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center p-4 text-center text-sm text-[var(--color-muted)]">
                  Could not render preview.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
