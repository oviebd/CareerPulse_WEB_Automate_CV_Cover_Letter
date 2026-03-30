'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, notFound, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatDate } from '@/lib/utils';
import { FeatureGate } from '@/components/shared/FeatureGate';
import { Modal } from '@/components/ui/modal';
import { CVFormFields, type CVFormTab } from '@/components/cv/CVFormFields';
import { Select } from '@/components/ui/select';
import { useCVProfile, useCoreCVVersions } from '@/hooks/useCV';
import { useJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import type {
  AwardEntry,
  CertificationEntry,
  CVProfile,
  CVTemplate,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  JobSpecificCV,
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
  SubscriptionTier,
} from '@/types';
import { canUseTemplate } from '@/lib/subscription';

function previewPayloadFromProfile(d: CVProfile): Record<string, unknown> {
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

function draftFromJobSpecificCV(j: JobSpecificCV): CVProfile {
  return {
    id: j.id,
    user_id: j.user_id,
    full_name: j.full_name,
    professional_title: j.professional_title,
    email: j.email,
    phone: j.phone,
    location: j.location,
    linkedin_url: j.linkedin_url,
    portfolio_url: j.portfolio_url,
    website_url: j.website_url,
    address: null,
    photo_url: null,
    summary: j.summary,
    experience: j.experience,
    education: j.education,
    skills: j.skills,
    projects: j.projects,
    certifications: j.certifications,
    languages: j.languages,
    awards: j.awards,
    referrals: [],
    section_visibility: {},
    is_complete: false,
    completion_percentage: 0,
    original_cv_file_url: null,
    preferred_cv_template_id: j.preferred_template_id ?? 'classic',
    preferred_cl_template_id: 'cl-classic',
    created_at: j.created_at,
    updated_at: j.updated_at,
  } as CVProfile;
}

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

export default function CVTemplatePreviewPage() {
  const queryClient = useQueryClient();
  const params = useParams();
  const templateId = typeof params.templateId === 'string' ? params.templateId : '';
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const jobCvId = searchParams.get('job_cv_id');
  const isJobMode = Boolean(jobCvId);

  const { data: coreVersions = [], isLoading: coreVersionsLoading } = useCoreCVVersions();
  const [selectedCoreCvId, setSelectedCoreCvId] = useState<string | null>(null);

  const { data: cv, isLoading: cvLoading, refetch } = useCVProfile(selectedCoreCvId);
  const {
    data: jobCv,
    isLoading: jobCvLoading,
    refetch: refetchJobCv,
  } = useJobSpecificCV(jobCvId ?? '');
  const { tier } = useSubscription();
  const [tab, setTab] = useState<CVFormTab>('header');
  const [draft, setDraft] = useState<CVProfile | null>(null);
  const [accent, setAccent] = useState('#2563EB');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewBusy, setPreviewBusy] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [exporting, setExporting] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [showUpdateCoreModal, setShowUpdateCoreModal] = useState(false);
  const [draftActive, setDraftActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () =>
      setDraftActive(Boolean(sessionStorage.getItem('cv_draft')));
    compute();
    const onUpdate = () => compute();
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
  }, []);

  useEffect(() => {
    if (isJobMode) return;
    if (draftActive) return;
    if (!coreVersionsLoading && coreVersions.length > 0) {
      setSelectedCoreCvId((prev) => prev ?? coreVersions[0]?.id ?? null);
    }
  }, [isJobMode, draftActive, coreVersionsLoading, coreVersions]);

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

  const templateMeta = templates.find((t) => t.id === templateId);
  const allowed = templateMeta
    ? canUseTemplate(templateMeta.available_tiers as SubscriptionTier[], tier)
    : false;

  useEffect(() => {
    if (!templatesLoading && templates.length > 0 && !templateMeta) {
      notFound();
    }
  }, [templatesLoading, templates.length, templateMeta]);

  useEffect(() => {
    const src = isJobMode ? jobCv : cv;
    if (!src) return;
    const profile = isJobMode
      ? draftFromJobSpecificCV(src as JobSpecificCV)
      : (src as CVProfile);
    setDraft((prev) => {
      if (prev?.id === profile.id && prev.updated_at === profile.updated_at) {
        return prev;
      }
      return structuredClone(profile) as CVProfile;
    });
  }, [cv, jobCv, isJobMode]);

  const refreshPreview = useCallback(async () => {
    if (!templateId || !draft) return;
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/cv/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          accent_color: accent,
          cv: previewPayloadFromProfile(draft),
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
  }, [templateId, draft, accent, toast]);

  useEffect(() => {
    if (!templateId || templatesLoading) return;
    const t = window.setTimeout(() => {
      void refreshPreview();
    }, 450);
    return () => window.clearTimeout(t);
  }, [templateId, templatesLoading, refreshPreview]);

  async function save() {
    if (!draft) return;
    setSaveState('saving');
    if (isJobMode && jobCvId) {
      const res = await fetch(`/api/cv/job-specific/${jobCvId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: draft.full_name,
          professional_title: draft.professional_title,
          email: draft.email,
          phone: draft.phone,
          location: draft.location,
          linkedin_url: draft.linkedin_url,
          portfolio_url: draft.portfolio_url,
          website_url: draft.website_url,
          summary: draft.summary,
          experience: draft.experience,
          education: draft.education,
          skills: draft.skills,
          projects: draft.projects,
          certifications: draft.certifications,
          languages: draft.languages,
          awards: draft.awards,
          preferred_template_id: templateId,
          accent_color: accent,
        }),
      });
      if (res.ok) {
        setSaveState('saved');
        await refetchJobCv();
        setTimeout(() => setSaveState('idle'), 2000);
        toast('Saved to Job CV.', 'success');
      } else {
        setSaveState('idle');
        toast('Could not save job CV changes.', 'error');
      }
      return;
    }

    const forceOverwrite =
      sessionStorage.getItem('cv_draft_force_overwrite') === '1';
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        core_cv_id: draftActive ? undefined : selectedCoreCvId,
        create_new: draftActive,
        force_overwrite_existing: forceOverwrite,
        preferred_cv_template_id: draftActive ? templateId : undefined,
        full_name: draft.full_name,
        professional_title: draft.professional_title,
        email: draft.email,
        phone: draft.phone,
        location: draft.location,
        linkedin_url: draft.linkedin_url,
        portfolio_url: draft.portfolio_url,
        website_url: draft.website_url,
        address: draft.address,
        photo_url: draft.photo_url,
        summary: draft.summary,
        // Ensure we never persist uploaded PDFs; we only keep extracted info.
        original_cv_file_url: null,
        section_visibility: draft.section_visibility,
        experience: draft.experience,
        education: draft.education,
        skills: draft.skills,
        projects: draft.projects,
        languages: draft.languages,
        certifications: draft.certifications,
        referrals: (draft.referrals ?? []).slice(0, 2),
        awards: draft.awards,
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      if (draftActive) {
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
      }
      void queryClient.invalidateQueries({ queryKey: ['cv-versions'] });
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
      toast('Could not save changes.', 'error');
    }
  }

  async function updateCoreFromDraft() {
    if (!draft) return;
    setSaveState('saving');
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // In job-CV mode, avoid overwriting fields that we don't snapshot
        // (address/photo/referrals) by only patching job-CV table fields.
        ...(isJobMode
          ? {
              full_name: draft.full_name,
              professional_title: draft.professional_title,
              email: draft.email,
              phone: draft.phone,
              location: draft.location,
              linkedin_url: draft.linkedin_url,
              portfolio_url: draft.portfolio_url,
              website_url: draft.website_url,
              summary: draft.summary,
              experience: draft.experience,
              education: draft.education,
              skills: draft.skills,
              projects: draft.projects,
              languages: draft.languages,
              certifications: draft.certifications,
              awards: draft.awards,
                  // Ensure we never persist uploaded PDFs; we only keep extracted info.
                  original_cv_file_url: null,
              section_visibility: draft.section_visibility,
            }
          : {
              full_name: draft.full_name,
              professional_title: draft.professional_title,
              email: draft.email,
              phone: draft.phone,
              location: draft.location,
              linkedin_url: draft.linkedin_url,
              portfolio_url: draft.portfolio_url,
              website_url: draft.website_url,
              address: draft.address,
              photo_url: draft.photo_url,
              summary: draft.summary,
                  // Ensure we never persist uploaded PDFs; we only keep extracted info.
                  original_cv_file_url: null,
              section_visibility: draft.section_visibility,
              experience: draft.experience,
              education: draft.education,
              skills: draft.skills,
              projects: draft.projects,
              languages: draft.languages,
              certifications: draft.certifications,
              referrals: (draft.referrals ?? []).slice(0, 2),
              awards: draft.awards,
            }),
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
      toast('Core CV updated.', 'success');
    } else {
      setSaveState('idle');
      toast('Could not update core CV.', 'error');
    }
  }

  async function setPreferredTemplate() {
    if (!cv || !templateId) return;
    if (draftActive) {
      toast('Press Save first to persist your core CV.', 'error');
      return;
    }
    setSettingDefault(true);
    const supabase = createClient();
    await supabase
      .from('cv_profiles')
      .update({ preferred_cv_template_id: templateId })
      .eq('id', cv.id);
    setSettingDefault(false);
    toast('Default template updated.', 'success');
  }

  async function exportPdf() {
    if (!draft || !templateId) return;
    if (!allowed) {
      toast('Upgrade to export with this template.', 'error');
      return;
    }
    setExporting(true);
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isJobMode
          ? {
              type: 'cv',
              job_cv_id: jobCvId,
              template_id: templateId,
              accent_color: accent,
              cv_snapshot: previewPayloadFromProfile(draft),
            }
          : {
              type: 'cv',
              id: cv?.id,
              template_id: templateId,
              accent_color: accent,
              cv_snapshot: previewPayloadFromProfile(draft),
            }
      ),
    });
    setExporting(false);
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
  }

  const isLoading = isJobMode ? jobCvLoading : cvLoading;

  if (isLoading || templatesLoading) {
    return (
      <p className="text-sm text-[var(--color-muted)]">Loading…</p>
    );
  }

  if (!isJobMode && !cv) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="font-display text-2xl font-bold">CV preview</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Create your CV profile first, then you can pick a template and edit here before exporting.
        </p>
        <Link
          href="/cv/edit"
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition',
            'bg-[var(--color-primary)] px-4 py-2.5 text-sm text-white shadow-sm hover:bg-[var(--color-primary-hover)]'
          )}
        >
          Create CV
        </Link>
        <div>
          <Link
            href="/cv/templates"
            className="text-sm font-semibold text-[var(--color-secondary)] hover:bg-slate-100 rounded-lg px-3 py-1.5"
          >
            Back to templates
          </Link>
        </div>
      </div>
    );
  }

  if (isJobMode && !jobCv) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="font-display text-2xl font-bold">CV preview</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Could not load the job-specific CV. It may have been archived or does not
          belong to your account.
        </p>
        <Link
          href="/cv/job-specific"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
        >
          Back to Job CVs
        </Link>
      </div>
    );
  }

  if (!draft) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/cv/templates"
              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--color-secondary)] hover:bg-slate-100"
            >
              ← Templates
            </Link>
          </div>
          <h1 className="font-display mt-2 text-2xl font-bold">
            {templateMeta?.name ?? 'Template'} preview
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Edit your details on the left; the preview updates as you type. Save when you are happy, then export PDF.
          </p>
          {!isJobMode ? (
            <div className="mt-4 max-w-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                Core CV version
              </p>
              <Select
                label={coreVersionsLoading ? 'Loading…' : 'Select saved core CV'}
                value={selectedCoreCvId ?? ''}
                disabled={
                  draftActive || coreVersionsLoading || coreVersions.length === 0
                }
                options={coreVersions.map((v) => ({
                  value: v.id,
                  label: `${v.full_name ?? 'Core CV'} · ${formatDate(
                    v.created_at
                  )}`,
                }))}
                onChange={(e) => setSelectedCoreCvId(e.target.value)}
              />
              {draftActive ? (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  You have an upload draft. Press <strong>Save</strong> to create a new version.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isJobMode ? (
            <Button
              variant="secondary"
              size="sm"
              loading={settingDefault}
              disabled={!allowed || draftActive}
              onClick={() => void setPreferredTemplate()}
            >
              Set as default
            </Button>
          ) : null}

          {!isJobMode ? (
            <Button
              variant="primary"
              size="sm"
              loading={saveState === 'saving'}
              onClick={() => void save()}
            >
              Save
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={saveState === 'saving'}
                onClick={() => void save()}
              >
                Save as Job CV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={saveState === 'saving'}
                onClick={() => setShowUpdateCoreModal(true)}
              >
                Update Core Profile
              </Button>
            </>
          )}

          <span className="text-xs text-[var(--color-muted)]">
            {saveState === 'saved' ? '✓ Saved' : ''}
          </span>
          <Button
            variant="primary"
            size="sm"
            loading={exporting}
            disabled={!allowed}
            onClick={() => void exportPdf()}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {!allowed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You can preview this layout with your data here. Upgrade to set it as default and export PDF with this template.
        </p>
      ) : null}

      <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-[var(--color-muted)]">Accent:</span>
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
              style={{ background: c }}
              onClick={() => setAccent(c)}
            />
          ))}
        </div>
      </FeatureGate>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,480px)]">
        <Card className="p-4 sm:p-6">
          <CVFormFields
            tab={tab}
            onTabChange={(id) => setTab(id as CVFormTab)}
            full_name={draft.full_name ?? ''}
            onFullName={(v) => setDraft({ ...draft, full_name: v })}
            professional_title={draft.professional_title ?? ''}
            onProfessionalTitle={(v) => setDraft({ ...draft, professional_title: v })}
            email={draft.email ?? ''}
            onEmail={(v) => setDraft({ ...draft, email: v })}
            phone={draft.phone ?? ''}
            onPhone={(v) => setDraft({ ...draft, phone: v })}
            location={draft.location ?? ''}
            onLocation={(v) => setDraft({ ...draft, location: v })}
            linkedin_url={draft.linkedin_url ?? ''}
            onLinkedinUrl={(v) => setDraft({ ...draft, linkedin_url: v })}
            portfolio_url={draft.portfolio_url ?? ''}
            onPortfolioUrl={(v) => setDraft({ ...draft, portfolio_url: v })}
            website_url={draft.website_url ?? ''}
            onWebsiteUrl={(v) => setDraft({ ...draft, website_url: v })}
            address={draft.address ?? ''}
            onAddress={(v) => setDraft({ ...draft, address: v })}
            photo_url={draft.photo_url ?? ''}
            onPhotoUrl={(v) => setDraft({ ...draft, photo_url: v })}
            summary={draft.summary ?? ''}
            onSummary={(v) => setDraft({ ...draft, summary: v })}
            sectionVisibility={draft.section_visibility ?? {}}
            onSectionVisibilityChange={(next) =>
              setDraft({ ...draft, section_visibility: next })
            }
            experience={
              (draft.experience?.length ? draft.experience : []) as ExperienceEntry[]
            }
            onExperienceChange={(experience) => setDraft({ ...draft, experience })}
            education={(draft.education?.length ? draft.education : []) as EducationEntry[]}
            onEducationChange={(education) => setDraft({ ...draft, education })}
            skills={(draft.skills?.length ? draft.skills : []) as SkillGroup[]}
            onSkillsChange={(skills) => setDraft({ ...draft, skills })}
            projects={(draft.projects?.length ? draft.projects : []) as ProjectEntry[]}
            onProjectsChange={(projects) => setDraft({ ...draft, projects })}
            languages={(draft.languages?.length ? draft.languages : []) as LanguageEntry[]}
            onLanguagesChange={(languages) => setDraft({ ...draft, languages })}
            certifications={
              (draft.certifications?.length ? draft.certifications : []) as CertificationEntry[]
            }
            onCertificationsChange={(certifications) =>
              setDraft({ ...draft, certifications })
            }
            referrals={
              ((draft.referrals?.length ? draft.referrals : []) as ReferralEntry[]).slice(
                0,
                2
              )
            }
            onReferralsChange={(referrals) =>
              setDraft({ ...draft, referrals: referrals.slice(0, 2) })
            }
            awards={(draft.awards?.length ? draft.awards : []) as AwardEntry[]}
            onAwardsChange={(awards) => setDraft({ ...draft, awards })}
          />
        </Card>

        <div className="lg:sticky lg:top-4 lg:self-start">
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
      {isJobMode ? (
        <Modal
          isOpen={showUpdateCoreModal}
          onClose={() => setShowUpdateCoreModal(false)}
          title="Update your core CV?"
        >
          <p className="text-sm text-[var(--color-secondary)]">
            This will overwrite your main CV profile with the tailored version.
            Your original information will be replaced.
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Consider saving as a Job CV instead to keep your original CV intact.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setShowUpdateCoreModal(false);
                void save();
              }}
              loading={saveState === 'saving'}
            >
              Save as Job CV instead
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowUpdateCoreModal(false);
                void updateCoreFromDraft();
              }}
              loading={saveState === 'saving'}
            >
              Yes, Update Core Profile
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
