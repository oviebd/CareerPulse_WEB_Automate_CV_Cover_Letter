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
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
} from '@/types';
import { CVFormFields, type CVFormTab } from '@/components/cv/CVFormFields';

export interface CVEditorPanelProps {
  value: CVData;
  onChange: (data: CVData) => void;
  mode?: 'full' | 'compact';
  readOnly?: boolean;
  highlightedKeywords?: string[];
}

export function CVEditorPanel({
  value,
  onChange,
  mode = 'full',
  readOnly = false,
  highlightedKeywords,
}: CVEditorPanelProps) {
  const [tab, setTab] = useState<CVFormTab>('header');
  const latestValue = useRef(value);
  latestValue.current = value;

  const [full_name, setFullName] = useState(value.full_name ?? '');
  const [professional_title, setTitle] = useState(value.professional_title ?? '');
  const [email, setEmail] = useState(value.email ?? '');
  const [phone, setPhone] = useState(value.phone ?? '');
  const [location, setLocation] = useState(value.location ?? '');
  const [linkedin_url, setLi] = useState(value.linkedin_url ?? '');
  const [portfolio_url, setPortfolio] = useState(value.portfolio_url ?? '');
  const [website_url, setWebsite] = useState(value.website_url ?? '');
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
    setPortfolio(value.portfolio_url ?? '');
    setWebsite(value.website_url ?? '');
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
        portfolio_url,
        website_url,
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
      portfolio_url,
      website_url,
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

  return (
    <div className="space-y-4">
      {highlightedKeywords && highlightedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="mr-1 text-xs font-medium text-amber-800">
            Highlighted keywords:
          </span>
          {highlightedKeywords.map((kw) => (
            <span
              key={kw}
              className="inline-block rounded bg-yellow-200 px-1.5 py-0.5 text-xs font-medium text-yellow-900"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
      <CVFormFields
        tab={tab}
        onTabChange={(id) => setTab(id as CVFormTab)}
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
        portfolio_url={portfolio_url}
        onPortfolioUrl={(v) => { setPortfolio(v); emitChange({ portfolio_url: v }); }}
        website_url={website_url}
        onWebsiteUrl={(v) => { setWebsite(v); emitChange({ website_url: v }); }}
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
        highlightedKeywords={highlightedKeywords}
      />
    </div>
  );
}
