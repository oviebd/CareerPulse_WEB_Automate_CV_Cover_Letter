'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  AwardEntry,
  CertificationEntry,
  CVData,
  CVSectionVisibility,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProfileLink,
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
} from '@/types';
import { CVFormFields, type CVFormTab, type AiJobContext } from '@/components/cv/CVFormFields';
import { Progress } from '@/components/ui/progress';
import { buildATSReport } from '@/lib/cv-ats';

export interface CVEditorPanelProps {
  value: CVData;
  onChange: (data: CVData) => void;
  mode?: 'full' | 'compact';
  readOnly?: boolean;
  highlightedKeywords?: string[];
  /** Job-specific context injected into "Rewrite with AI" requests. */
  aiJobContext?: AiJobContext;
  /** Controlled section tab (sync with side nav). */
  activeTab?: CVFormTab;
  onActiveTabChange?: (tab: CVFormTab) => void;
  /** Hide the large ATS checker card (e.g. when the parent shows ATS in the header). */
  hideAtsBanner?: boolean;
  /** Hide horizontal tab row when using a side nav. */
  hideFormTabBar?: boolean;
  /** Hide the inline keyword chips strip (parent renders a custom keywords UI). */
  hideKeywordsBanner?: boolean;
  hideVisibilityPanel?: boolean;
  templates?: any[];
  selectedTemplateId?: string;
  onTemplateChange?: (id: string) => void;
  accent?: string;
  onAccentChange?: (color: string) => void;
  fontFamily?: string;
  onFontFamilyChange?: (font: string) => void;
  coreVersions?: any[];
  selectedCoreCvId?: string | null;
  onSelectedCoreCvIdChange?: (id: string) => void;
  coreVersionsLoading?: boolean;
}

export function CVEditorPanel({
  value,
  onChange,
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
  coreVersions = [],
  selectedCoreCvId,
  onSelectedCoreCvIdChange,
  coreVersionsLoading = false,
}: CVEditorPanelProps) {
  const [internalTab, setInternalTab] = useState<CVFormTab>('header');
  const isTabControlled = activeTabProp !== undefined && onActiveTabChange !== undefined;
  const tab = isTabControlled ? activeTabProp : internalTab;
  const setTab = (next: CVFormTab) => {
    if (isTabControlled) onActiveTabChange(next);
    else setInternalTab(next);
  };
  const latestValue = useRef(value);
  latestValue.current = value;

  const [full_name, setFullName] = useState(value.full_name ?? '');
  const [professional_title, setTitle] = useState(value.professional_title ?? '');
  const [email, setEmail] = useState(value.email ?? '');
  const [phone, setPhone] = useState(value.phone ?? '');
  const [location, setLocation] = useState(value.location ?? '');
  const [linkedin_url, setLi] = useState(value.linkedin_url ?? '');
  const [github_url, setGithub] = useState(value.github_url ?? '');
  const [links, setLinks] = useState<ProfileLink[]>(value.links ?? []);
  const [address, setAddress] = useState(value.address ?? '');
  const [photo_url, setPhotoUrl] = useState(value.photo_url ?? '');
  const [summary, setSummary] = useState(value.summary ?? '');
  const [section_visibility, setSectionVisibility] = useState<CVSectionVisibility>(
    value.section_visibility ?? {}
  );
  const [experience, setExperience] = useState<ExperienceEntry[]>(
    (value.experience ?? []) as ExperienceEntry[]
  );
  const [education, setEducation] = useState<EducationEntry[]>(
    (value.education ?? []) as EducationEntry[]
  );
  const [skills, setSkills] = useState<SkillGroup[]>(
    (value.skills ?? []) as SkillGroup[]
  );
  const [projects, setProjects] = useState<ProjectEntry[]>(
    (value.projects ?? []) as ProjectEntry[]
  );
  const [languages, setLanguages] = useState<LanguageEntry[]>(
    (value.languages ?? []) as LanguageEntry[]
  );
  const [certifications, setCertifications] = useState<CertificationEntry[]>(
    (value.certifications ?? []) as CertificationEntry[]
  );
  const [referrals, setReferrals] = useState<ReferralEntry[]>(
    (value.referrals ?? []) as ReferralEntry[]
  );
  const [awards, setAwards] = useState<AwardEntry[]>(
    (value.awards ?? []) as AwardEntry[]
  );

  const isExternalUpdate = useRef(false);

  useEffect(() => {
    isExternalUpdate.current = true;
    setFullName(value.full_name ?? '');
    setTitle(value.professional_title ?? '');
    setEmail(value.email ?? '');
    setPhone(value.phone ?? '');
    setLocation(value.location ?? '');
    setLi(value.linkedin_url ?? '');
    setGithub(value.github_url ?? '');
    setLinks(value.links ?? []);
    setAddress(value.address ?? '');
    setPhotoUrl(value.photo_url ?? '');
    setSummary(value.summary ?? '');
    setSectionVisibility(value.section_visibility ?? {});
    setExperience((value.experience ?? []) as ExperienceEntry[]);
    setEducation((value.education ?? []) as EducationEntry[]);
    setSkills((value.skills ?? []) as SkillGroup[]);
    setProjects((value.projects ?? []) as ProjectEntry[]);
    setLanguages((value.languages ?? []) as LanguageEntry[]);
    setCertifications((value.certifications ?? []) as CertificationEntry[]);
    setReferrals((value.referrals ?? []) as ReferralEntry[]);
    setAwards((value.awards ?? []) as AwardEntry[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emitChange = useCallback(
    (overrides: Partial<CVData>) => {
      const next: CVData = {
        full_name,
        professional_title,
        email,
        phone,
        location,
        linkedin_url,
        github_url,
        links,
        section_visibility,
        address,
        photo_url,
        summary,
        experience,
        education,
        skills,
        projects,
        certifications,
        languages,
        awards,
        referrals,
        ...overrides,
      };
      onChange(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      full_name,
      professional_title,
      email,
      phone,
      location,
      linkedin_url,
      github_url,
      links,
      section_visibility,
      address,
      photo_url,
      summary,
      experience,
      education,
      skills,
      projects,
      certifications,
      languages,
      awards,
      referrals,
      onChange,
    ]
  );

  const makeHandler = <T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    key: keyof CVData
  ) => {
    return (v: T) => {
      setter(v);
      emitChange({ [key]: v } as Partial<CVData>);
    };
  };

  const COMPACT_TABS: CVFormTab[] = ['header', 'summary', 'experience', 'education', 'skills'];
  const ats = buildATSReport(value, highlightedKeywords ?? []);

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
          <Progress value={ats.score} className="mt-3 h-2.5 bg-white/[0.08]" />
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
        full_name={full_name}
        onFullName={(v) => { setFullName(v); emitChange({ full_name: v }); }}
        professional_title={professional_title}
        onProfessionalTitle={(v) => { setTitle(v); emitChange({ professional_title: v }); }}
        email={email}
        onEmail={(v) => { setEmail(v); emitChange({ email: v }); }}
        phone={phone}
        onPhone={(v) => { setPhone(v); emitChange({ phone: v }); }}
        location={location}
        onLocation={(v) => { setLocation(v); emitChange({ location: v }); }}
        linkedin_url={linkedin_url}
        onLinkedinUrl={(v) => { setLi(v); emitChange({ linkedin_url: v }); }}
        github_url={github_url}
        onGithubUrl={(v) => { setGithub(v); emitChange({ github_url: v }); }}
        links={links}
        onLinksChange={(v) => { setLinks(v); emitChange({ links: v }); }}
        address={address}
        onAddress={(v) => { setAddress(v); emitChange({ address: v }); }}
        photo_url={photo_url}
        onPhotoUrl={(v) => { setPhotoUrl(v ?? ''); emitChange({ photo_url: v }); }}
        summary={summary}
        onSummary={(v) => { setSummary(v); emitChange({ summary: v }); }}
        sectionVisibility={section_visibility}
        onSectionVisibilityChange={(v) => {
          setSectionVisibility(v);
          emitChange({ section_visibility: v });
        }}
        experience={experience}
        onExperienceChange={(v) => { setExperience(v); emitChange({ experience: v }); }}
        education={education}
        onEducationChange={(v) => { setEducation(v); emitChange({ education: v }); }}
        skills={skills}
        onSkillsChange={(v) => { setSkills(v); emitChange({ skills: v }); }}
        projects={projects}
        onProjectsChange={(v) => { setProjects(v); emitChange({ projects: v }); }}
        languages={languages}
        onLanguagesChange={(v) => { setLanguages(v); emitChange({ languages: v }); }}
        certifications={certifications}
        onCertificationsChange={(v) => { setCertifications(v); emitChange({ certifications: v }); }}
        referrals={referrals}
        onReferralsChange={(v) => { setReferrals(v.slice(0, 2)); emitChange({ referrals: v.slice(0, 2) as ReferralEntry[] }); }}
        awards={awards}
        onAwardsChange={(v) => { setAwards(v); emitChange({ awards: v }); }}
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
        coreVersions={coreVersions}
        selectedCoreCvId={selectedCoreCvId}
        onSelectedCoreCvIdChange={onSelectedCoreCvIdChange}
        coreVersionsLoading={coreVersionsLoading}
      />
    </div>
  );
}
