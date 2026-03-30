'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCVProfile, useCoreCVVersions } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CVEditorPanel } from '@/components/cv/CVEditorPanel';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { FeatureGate, TemplateGate } from '@/components/shared/FeatureGate';
import { useToast } from '@/components/ui/toast';
import type { CVData } from '@/types';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { formatDate } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

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
    // Used by applyCvSectionVisibility() during HTML/PDF rendering.
    section_visibility: d.section_visibility ?? {},
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

export function CVEditor() {
  const queryClient = useQueryClient();
  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();
  const [selectedCoreCvId, setSelectedCoreCvId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const coreCvIdFromQuery = searchParams.get('core_cv_id');

  const { data: cv, isLoading, refetch } = useCVProfile(selectedCoreCvId);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [cvData, setCvData] = useState<CVData | null>(null);
  const initialized = useRef(false);

  const [draftActive, setDraftActive] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => setDraftActive(Boolean(sessionStorage.getItem('cv_draft')));
    compute();
    const onUpdate = () => compute();
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
  }, []);

  useEffect(() => {
    if (draftActive) return;
    if (!coreVersionsLoading && coreVersions.length > 0) {
      const latestId = coreVersions[0]?.id ?? null;
      const requestedId =
        coreCvIdFromQuery && coreVersions.some((v) => v.id === coreCvIdFromQuery)
          ? coreCvIdFromQuery
          : null;
      setSelectedCoreCvId((prev) => (prev ? prev : requestedId ?? latestId));
    }
  }, [coreVersionsLoading, coreVersions, draftActive, coreCvIdFromQuery]);

  useEffect(() => {
    // Reset initialization when the user changes versions (or a draft appears).
    initialized.current = false;
  }, [selectedCoreCvId, draftActive]);

  const { toast } = useToast();
  const { tier } = useSubscription();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic');
  const [accent, setAccent] = useState('#2563EB');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const templateMeta = templates.find((t) => t.id === selectedTemplateId) ?? null;
  const allowed = templateMeta
    ? canUseTemplate(templateMeta.available_tiers as SubscriptionTier[], tier)
    : false;

  useEffect(() => {
    if (!cv || initialized.current) return;
    initialized.current = true;
    setSelectedTemplateId(cv.preferred_cv_template_id ?? 'classic');
    setCvData({
      full_name: cv.full_name ?? null,
      professional_title: cv.professional_title ?? null,
      email: cv.email ?? null,
      phone: cv.phone ?? null,
      location: cv.location ?? null,
      linkedin_url: cv.linkedin_url ?? null,
      portfolio_url: cv.portfolio_url ?? null,
      website_url: cv.website_url ?? null,
      address: cv.address ?? null,
      photo_url: cv.photo_url ?? null,
      summary: cv.summary ?? null,
      experience: cv.experience ?? [],
      education: cv.education ?? [],
      skills: cv.skills ?? [],
      projects: cv.projects ?? [],
      certifications: cv.certifications ?? [],
      languages: cv.languages ?? [],
      awards: cv.awards ?? [],
      referrals: cv.referrals ?? [],
    });
  }, [cv]);

  const handleChange = useCallback((data: CVData) => {
    setCvData(data);
  }, []);

  useEffect(() => {
    if (templatesLoading || !templates.length) return;
    if (templates.some((t) => t.id === selectedTemplateId)) return;
    // Fallback if the saved preferred template was deleted/changed.
    setSelectedTemplateId(templates[0].id);
  }, [templatesLoading, templates, selectedTemplateId]);

  const refreshPreview = useCallback(async () => {
    if (!selectedTemplateId || !cvData) return;
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          id: cv?.id,
          template_id: selectedTemplateId,
          accent_color: accent,
          cv_snapshot: previewPayloadFromCVData(cvData),
        }),
      });
      if (!res.ok) {
        setPreviewPdfUrl('');
        return;
      }
      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
    } finally {
      setPreviewBusy(false);
    }
  }, [selectedTemplateId, cvData, accent, cv?.id]);

  useEffect(() => {
    if (!selectedTemplateId || !cvData || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 700);
    return () => window.clearTimeout(t);
  }, [selectedTemplateId, cvData, templatesLoading, refreshPreview]);

  useEffect(() => {
    return () => {
      setPreviewPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return '';
      });
    };
  }, []);

  async function setPreferredTemplate() {
    if (!cv || !selectedTemplateId) return;
    if (draftActive) {
      toast('Press Save first to persist your core CV.', 'error');
      return;
    }
    setSettingDefault(true);
    try {
      const supabase = createClient();
      await supabase
        .from('cv_profiles')
        .update({ preferred_cv_template_id: selectedTemplateId })
        .eq('id', cv.id);
      toast('Default template updated.', 'success');
      void refetch();
    } catch (e) {
      toast('Could not update template.', 'error');
    } finally {
      setSettingDefault(false);
    }
  }

  async function save() {
    if (!cvData) return;
    setSaveState('saving');

    const forceOverwrite =
      sessionStorage.getItem('cv_draft_force_overwrite') === '1';
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        core_cv_id: draftActive ? undefined : selectedCoreCvId,
        create_new: draftActive,
        force_overwrite_existing: forceOverwrite,
        preferred_cv_template_id: draftActive ? selectedTemplateId : undefined,
        full_name: cvData.full_name,
        professional_title: cvData.professional_title,
        email: cvData.email,
        phone: cvData.phone,
        location: cvData.location,
        linkedin_url: cvData.linkedin_url,
        portfolio_url: cvData.portfolio_url,
        website_url: cvData.website_url,
        address: cvData.address,
        photo_url: cvData.photo_url || null,
        summary: cvData.summary,
        // Ensure we never persist uploaded PDFs; we only keep extracted info.
        original_cv_file_url: null,
        section_visibility: cvData.section_visibility ?? {},
        experience: cvData.experience,
        education: cvData.education,
        skills: cvData.skills,
        projects: cvData.projects,
        languages: cvData.languages,
        certifications: cvData.certifications,
        referrals: (cvData.referrals ?? []).slice(0, 2),
        awards: cvData.awards,
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      // Persist has completed; draft is no longer needed.
      try {
        sessionStorage.removeItem('cv_draft');
        sessionStorage.removeItem('cv_draft_force_overwrite');
        window.dispatchEvent(new Event('cv_draft_updated'));
      } catch {
        // ignore
      }
      try {
        const json = (await res.json()) as { cvProfile?: { id?: string } };
        if (json.cvProfile?.id) setSelectedCoreCvId(json.cvProfile.id);
      } catch {
        // ignore
      }
      void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
    }
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
          id: cv?.id,
          template_id: selectedTemplateId,
          accent_color: accent,
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

  if (isLoading || !cvData) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Edit CV</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Choose a template and preview updates live while you edit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {cv ? (
              <>
                Completion: <strong>{cv.completion_percentage}%</strong>
              </>
            ) : (
              'New profile'
            )}
          </span>
          <Button
            variant="primary"
            size="sm"
            loading={saveState === 'saving'}
            onClick={() => void save()}
          >
            Save
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
            {saveState === 'saved' ? '✓ Saved' : ''}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)]">
        <Card className="p-4 sm:p-6">
          <CVEditorPanel value={cvData} onChange={handleChange} />
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Core CV version
            </p>
            <Select
              label={coreVersionsLoading ? 'Loading…' : 'Select saved core CV'}
              value={selectedCoreCvId ?? ''}
              disabled={draftActive || coreVersionsLoading || coreVersions.length === 0}
              options={coreVersions.map((v) => ({
                value: v.id,
                label: `${v.full_name ?? 'Core CV'} · ${formatDate(v.created_at)}`,
              }))}
              onChange={(e) => setSelectedCoreCvId(e.target.value)}
            />
            {draftActive ? (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                You have an upload draft. Press <strong>Save</strong> to create a new version.
              </p>
            ) : null}
          </div>

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
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            />
            {!allowed && templateMeta ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Upgrade to set this template as default.
              </p>
            ) : null}
          </div>

          <TemplateGate
            availableTiers={(templateMeta?.available_tiers ?? []) as SubscriptionTier[]}
            userTier={tier}
          >
            <Button
              variant="secondary"
              size="sm"
              loading={settingDefault}
              disabled={!allowed || draftActive}
              onClick={() => void setPreferredTemplate()}
            >
              Set as default
            </Button>
          </TemplateGate>

          <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">Accent:</span>
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                  aria-label={`Set accent ${c}`}
                />
              ))}
            </div>
          </FeatureGate>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
              Print preview (A4)
            </p>
            <div
              className="relative overflow-auto rounded-lg border border-[var(--color-border)] bg-slate-100 shadow-inner"
              style={{ height: '70vh' }}
            >
              {previewBusy ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)]">
                  Updating preview…
                </div>
              ) : null}
              {previewPdfUrl ? (
                <iframe
                  title="CV print preview"
                  className="min-h-[1100px] w-full"
                  src={previewPdfUrl}
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
