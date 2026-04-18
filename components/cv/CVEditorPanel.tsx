'use client';

import { useMemo, useState, useCallback, useDeferredValue } from 'react';
import type { CVData, SubscriptionTier } from '@/types';
import { CVFormFields, type CVFormTab, type AiJobContext } from '@/components/cv/CVFormFields';
import { Progress } from '@/components/ui/progress';
import { buildATSReport } from '@/lib/cv-ats';
import {
  cvDataToFormSlices,
  formSlicesToCvData,
  type FormSlices,
} from '@/lib/cv-form-slices';
import { useCVDocumentStore } from '@/src/store/cvStore';

export interface CVEditorPanelProps {
  /** Core CV editor: read/write via Zustand for granular updates + fewer parent re-renders. */
  useDocumentStore?: boolean;
  value?: CVData;
  onChange?: (data: CVData) => void;
  mode?: 'full' | 'compact';
  readOnly?: boolean;
  highlightedKeywords?: string[];
  aiJobContext?: AiJobContext;
  activeTab?: CVFormTab;
  onActiveTabChange?: (tab: CVFormTab) => void;
  hideAtsBanner?: boolean;
  hideFormTabBar?: boolean;
  hideKeywordsBanner?: boolean;
  hideVisibilityPanel?: boolean;
  templates?: any[];
  selectedTemplateId?: string;
  onTemplateChange?: (id: string) => void;
  accent?: string;
  onAccentChange?: (color: string) => void;
  fontFamily?: string;
  onFontFamilyChange?: (font: string) => void;
  userTier?: SubscriptionTier;
}

export function CVEditorPanel({
  useDocumentStore = false,
  value: valueProp,
  onChange: onChangeProp,
  mode = 'full',
  readOnly = false,
  highlightedKeywords,
  aiJobContext,
  activeTab: activeTabProp,
  onActiveTabChange,
  hideAtsBanner = false,
  hideFormTabBar = false,
  hideKeywordsBanner = false,
  hideVisibilityPanel = false,
  templates = [],
  selectedTemplateId,
  onTemplateChange,
  accent,
  onAccentChange,
  fontFamily,
  onFontFamilyChange,
  userTier,
}: CVEditorPanelProps) {
  const storeCvData = useCVDocumentStore((s) => s.cvData);
  const value = useDocumentStore ? storeCvData! : valueProp!;

  const [internalTab, setInternalTab] = useState<CVFormTab>('photo');
  const isTabControlled = activeTabProp !== undefined && onActiveTabChange !== undefined;
  const tab = isTabControlled ? activeTabProp : internalTab;
  const setTab = (next: CVFormTab) => {
    if (isTabControlled) onActiveTabChange(next);
    else setInternalTab(next);
  };

  const slices = useMemo(() => cvDataToFormSlices(value), [value]);

  const design = useMemo(
    () => ({
      preferred_template_id: selectedTemplateId ?? value.meta.templateId,
      accent_color: accent ?? value.meta.colorScheme,
      font_family: fontFamily ?? value.meta.fontFamily,
    }),
    [selectedTemplateId, accent, fontFamily, value.meta]
  );

  const applyPatch = useCallback(
    (patch: Partial<FormSlices>) => {
      if (useDocumentStore) {
        useCVDocumentStore.getState().applyFormSlicesPatch(patch);
        return;
      }
      if (!onChangeProp) return;
      const base = cvDataToFormSlices(value);
      onChangeProp(formSlicesToCvData(value, { ...base, ...patch }, design));
    },
    [useDocumentStore, value, onChangeProp, design]
  );

  const deferredForAts = useDeferredValue(value);
  const ats = buildATSReport(deferredForAts, highlightedKeywords ?? []);

  if (useDocumentStore && !storeCvData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {hideAtsBanner ? null : (
        <div className="rounded-lg border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-100)]/40 p-4 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-400)]">
                ATS Checker
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-primary)]">{ats.summary}</p>
            </div>
            <span className="rounded-badge border border-[var(--color-primary-200)] bg-[var(--color-primary-100)] px-2.5 py-1 font-mono text-sm font-semibold text-[var(--color-primary-400)]">
              {ats.score}/100
            </span>
          </div>
          <Progress value={ats.score} className="mt-3 h-2.5" />
          {ats.suggestions.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--color-muted)]">
              {ats.suggestions.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-muted)]">Great work. Your CV is ATS-friendly.</p>
          )}
        </div>
      )}

      {!hideKeywordsBanner && highlightedKeywords && highlightedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--color-accent-gold)]/25 bg-[var(--color-accent-gold)]/10 p-3">
          <span className="mr-1 text-xs font-medium text-[var(--color-accent-gold)]">
            Highlighted keywords:
          </span>
          {highlightedKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-block rounded-badge border border-[var(--color-accent-gold)]/35 bg-[var(--color-accent-gold)]/15 px-1.5 py-0.5 text-xs font-medium text-[var(--color-accent-gold)]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
      <CVFormFields
        tab={tab}
        onTabChange={(id) => setTab(id as CVFormTab)}
        hideTabBar={hideFormTabBar}
        full_name={slices.full_name}
        onFullName={(v) => applyPatch({ full_name: v })}
        professional_title={slices.professional_title}
        onProfessionalTitle={(v) => applyPatch({ professional_title: v })}
        email={slices.email}
        onEmail={(v) => applyPatch({ email: v })}
        phone={slices.phone}
        onPhone={(v) => applyPatch({ phone: v })}
        location={slices.location}
        onLocation={(v) => applyPatch({ location: v })}
        linkedin_url={slices.linkedin_url}
        onLinkedinUrl={(v) => applyPatch({ linkedin_url: v })}
        github_url={slices.github_url}
        onGithubUrl={(v) => applyPatch({ github_url: v })}
        links={slices.links}
        onLinksChange={(v) => applyPatch({ links: v })}
        address={slices.address}
        onAddress={(v) => applyPatch({ address: v })}
        photo_url={slices.photo_url}
        onPhotoUrl={(v) => applyPatch({ photo_url: v ?? '' })}
        summary={slices.summary}
        onSummary={(v) => applyPatch({ summary: v })}
        sectionVisibility={slices.section_visibility}
        onSectionVisibilityChange={(v) => applyPatch({ section_visibility: v })}
        experience={slices.experience}
        onExperienceChange={(v) => applyPatch({ experience: v })}
        education={slices.education}
        onEducationChange={(v) => applyPatch({ education: v })}
        skills={slices.skills}
        onSkillsChange={(v) => applyPatch({ skills: v })}
        projects={slices.projects}
        onProjectsChange={(v) => applyPatch({ projects: v })}
        languages={slices.languages}
        onLanguagesChange={(v) => applyPatch({ languages: v })}
        certifications={slices.certifications}
        onCertificationsChange={(v) => applyPatch({ certifications: v })}
        referrals={slices.referrals}
        onReferralsChange={(v) => applyPatch({ referrals: v.slice(0, 2) })}
        awards={slices.awards}
        onAwardsChange={(v) => applyPatch({ awards: v })}
        publications={slices.publications}
        onPublicationsChange={(v) => applyPatch({ publications: v })}
        research={slices.research}
        onResearchChange={(v) => applyPatch({ research: v })}
        volunteer={slices.volunteer}
        onVolunteerChange={(v) => applyPatch({ volunteer: v })}
        interestsText={slices.interestsText}
        onInterestsTextChange={(v) => applyPatch({ interestsText: v })}
        custom={slices.custom}
        onCustomChange={(v) => applyPatch({ custom: v })}
        userTier={userTier}
        hiddenTabs={mode === 'compact' ? undefined : undefined}
        hideVisibilityPanel={hideVisibilityPanel}
        highlightedKeywords={highlightedKeywords}
        atsBySection={ats.sections}
        aiJobContext={aiJobContext}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={onTemplateChange}
        accent={accent}
        onAccentChange={onAccentChange}
        fontFamily={fontFamily}
        onFontFamilyChange={onFontFamilyChange}
      />
    </div>
  );
}
