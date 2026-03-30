'use client';

import { useEffect, useState } from 'react';
import { useCVProfile } from '@/hooks/useCV';
import { Button } from '@/components/ui/button';
import type {
  AwardEntry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SkillGroup,
} from '@/types';
import { CVFormFields, type CVFormTab } from '@/components/cv/CVFormFields';

export function CVEditor() {
  const { data: cv, isLoading, refetch } = useCVProfile();
  const [tab, setTab] = useState<CVFormTab>('header');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [full_name, setFullName] = useState('');
  const [professional_title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin_url, setLi] = useState('');
  const [portfolio_url, setPortfolio] = useState('');
  const [website_url, setWebsite] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [skills, setSkills] = useState<SkillGroup[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [certifications, setCertifications] = useState<CertificationEntry[]>([]);
  const [awards, setAwards] = useState<AwardEntry[]>([]);

  useEffect(() => {
    if (!cv) return;
    setFullName(cv.full_name ?? '');
    setTitle(cv.professional_title ?? '');
    setEmail(cv.email ?? '');
    setPhone(cv.phone ?? '');
    setLocation(cv.location ?? '');
    setLi(cv.linkedin_url ?? '');
    setPortfolio(cv.portfolio_url ?? '');
    setWebsite(cv.website_url ?? '');
    setSummary(cv.summary ?? '');
    setExperience((cv.experience?.length ? cv.experience : []) as ExperienceEntry[]);
    setEducation((cv.education?.length ? cv.education : []) as EducationEntry[]);
    setSkills((cv.skills?.length ? cv.skills : []) as SkillGroup[]);
    setProjects((cv.projects?.length ? cv.projects : []) as ProjectEntry[]);
    setLanguages((cv.languages?.length ? cv.languages : []) as LanguageEntry[]);
    setCertifications(
      (cv.certifications?.length ? cv.certifications : []) as CertificationEntry[]
    );
    setAwards((cv.awards?.length ? cv.awards : []) as AwardEntry[]);
  }, [cv]);

  async function save() {
    setSaveState('saving');
    const res = await fetch('/api/cv', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name,
        professional_title,
        email,
        phone,
        location,
        linkedin_url,
        portfolio_url,
        website_url,
        summary,
        experience,
        education,
        skills,
        projects,
        languages,
        certifications,
        awards,
      }),
    });
    if (res.ok) {
      setSaveState('saved');
      void refetch();
      setTimeout(() => setSaveState('idle'), 2000);
    } else {
      setSaveState('idle');
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading profile…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Edit CV</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-muted)]">
            {cv ? (
              <>
                Completion: <strong>{cv.completion_percentage}%</strong>
              </>
            ) : (
              'New profile'
            )}
          </span>
          <Button variant="primary" size="sm" loading={saveState === 'saving'} onClick={() => void save()}>
            Save
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            {saveState === 'saved' ? '✓ Saved' : ''}
          </span>
        </div>
      </div>
      <CVFormFields
        tab={tab}
        onTabChange={(id) => setTab(id as CVFormTab)}
        full_name={full_name}
        onFullName={setFullName}
        professional_title={professional_title}
        onProfessionalTitle={setTitle}
        email={email}
        onEmail={setEmail}
        phone={phone}
        onPhone={setPhone}
        location={location}
        onLocation={setLocation}
        linkedin_url={linkedin_url}
        onLinkedinUrl={setLi}
        portfolio_url={portfolio_url}
        onPortfolioUrl={setPortfolio}
        website_url={website_url}
        onWebsiteUrl={setWebsite}
        summary={summary}
        onSummary={setSummary}
        experience={experience}
        onExperienceChange={setExperience}
        education={education}
        onEducationChange={setEducation}
        skills={skills}
        onSkillsChange={setSkills}
        projects={projects}
        onProjectsChange={setProjects}
        languages={languages}
        onLanguagesChange={setLanguages}
        certifications={certifications}
        onCertificationsChange={setCertifications}
        awards={awards}
        onAwardsChange={setAwards}
      />
    </div>
  );
}
