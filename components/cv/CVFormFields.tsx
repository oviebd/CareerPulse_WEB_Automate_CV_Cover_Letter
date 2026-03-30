'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type {
  AwardEntry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SkillGroup,
} from '@/types';
import { generateId } from '@/lib/utils';

export type CVFormTab =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'languages'
  | 'certifications'
  | 'awards';

const DEGREE_OPTIONS = [
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'Other', label: 'Other' },
];

const SKILL_CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Technical' },
  { value: 'tools', label: 'Tools' },
  { value: 'soft', label: 'Soft skills' },
  { value: 'languages', label: 'Languages (skill group)' },
];

const PROFICIENCY_OPTIONS = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'basic', label: 'Basic' },
];

type Props = {
  tab: CVFormTab;
  onTabChange: (id: string) => void;
  full_name: string;
  onFullName: (v: string) => void;
  professional_title: string;
  onProfessionalTitle: (v: string) => void;
  email: string;
  onEmail: (v: string) => void;
  phone: string;
  onPhone: (v: string) => void;
  location: string;
  onLocation: (v: string) => void;
  linkedin_url: string;
  onLinkedinUrl: (v: string) => void;
  portfolio_url: string;
  onPortfolioUrl: (v: string) => void;
  website_url: string;
  onWebsiteUrl: (v: string) => void;
  summary: string;
  onSummary: (v: string) => void;
  experience: ExperienceEntry[];
  onExperienceChange: (next: ExperienceEntry[]) => void;
  education: EducationEntry[];
  onEducationChange: (next: EducationEntry[]) => void;
  skills: SkillGroup[];
  onSkillsChange: (next: SkillGroup[]) => void;
  projects: ProjectEntry[];
  onProjectsChange: (next: ProjectEntry[]) => void;
  languages: LanguageEntry[];
  onLanguagesChange: (next: LanguageEntry[]) => void;
  certifications: CertificationEntry[];
  onCertificationsChange: (next: CertificationEntry[]) => void;
  awards: AwardEntry[];
  onAwardsChange: (next: AwardEntry[]) => void;
};

const TAB_DEFS: { id: CVFormTab; label: string }[] = [
  { id: 'header', label: 'Header & contact' },
  { id: 'summary', label: 'Summary' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'languages', label: 'Languages' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'awards', label: 'Awards' },
];

export function CVFormFields(props: Props) {
  const {
    tab,
    onTabChange,
    full_name,
    onFullName,
    professional_title,
    onProfessionalTitle,
    email,
    onEmail,
    phone,
    onPhone,
    location,
    onLocation,
    linkedin_url,
    onLinkedinUrl,
    portfolio_url,
    onPortfolioUrl,
    website_url,
    onWebsiteUrl,
    summary,
    onSummary,
    experience,
    onExperienceChange,
    education,
    onEducationChange,
    skills,
    onSkillsChange,
    projects,
    onProjectsChange,
    languages,
    onLanguagesChange,
    certifications,
    onCertificationsChange,
    awards,
    onAwardsChange,
  } = props;

  return (
    <>
      <Tabs value={tab} onChange={onTabChange} tabs={TAB_DEFS} />
      <div className="pt-4">
        {tab === 'header' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={full_name} onChange={(e) => onFullName(e.target.value)} />
            <Input
              label="Professional title"
              value={professional_title}
              onChange={(e) => onProfessionalTitle(e.target.value)}
            />
            <Input label="Email" type="email" value={email} onChange={(e) => onEmail(e.target.value)} />
            <Input label="Phone" value={phone} onChange={(e) => onPhone(e.target.value)} />
            <Input label="Location" value={location} onChange={(e) => onLocation(e.target.value)} />
            <Input
              label="LinkedIn URL"
              value={linkedin_url}
              onChange={(e) => onLinkedinUrl(e.target.value)}
            />
            <Input
              label="Portfolio URL"
              value={portfolio_url}
              onChange={(e) => onPortfolioUrl(e.target.value)}
            />
            <Input label="Website URL" value={website_url} onChange={(e) => onWebsiteUrl(e.target.value)} />
          </div>
        ) : null}

        {tab === 'summary' ? (
          <Textarea
            label="Summary"
            maxLength={2000}
            value={summary}
            onChange={(e) => onSummary(e.target.value)}
          />
        ) : null}

        {tab === 'experience' ? (
          <div className="space-y-4">
            {experience.map((ex, i) => (
              <div key={ex.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Job title"
                    value={ex.title}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, title: e.target.value };
                      onExperienceChange(n);
                    }}
                  />
                  <Input
                    label="Company"
                    value={ex.company}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, company: e.target.value };
                      onExperienceChange(n);
                    }}
                  />
                  <Input
                    label="Location"
                    value={ex.location ?? ''}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, location: e.target.value };
                      onExperienceChange(n);
                    }}
                  />
                  <Input
                    label="Start (month)"
                    type="month"
                    value={ex.start_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, start_date: e.target.value };
                      onExperienceChange(n);
                    }}
                  />
                  <Input
                    label="End (month)"
                    type="month"
                    value={ex.end_date?.slice(0, 7) ?? ''}
                    disabled={ex.is_current}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = { ...ex, end_date: e.target.value || null };
                      onExperienceChange(n);
                    }}
                  />
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[var(--color-secondary)]">
                  <input
                    type="checkbox"
                    className="rounded border-[var(--color-border)]"
                    checked={ex.is_current}
                    onChange={(e) => {
                      const n = [...experience];
                      n[i] = {
                        ...ex,
                        is_current: e.target.checked,
                        end_date: e.target.checked ? null : ex.end_date,
                      };
                      onExperienceChange(n);
                    }}
                  />
                  I currently work here
                </label>
                <Textarea
                  className="mt-3"
                  label="Role description (optional)"
                  value={ex.description ?? ''}
                  onChange={(e) => {
                    const n = [...experience];
                    n[i] = { ...ex, description: e.target.value || null };
                    onExperienceChange(n);
                  }}
                />
                <Textarea
                  className="mt-3"
                  label="Bullets (one per line)"
                  value={ex.bullets.join('\n')}
                  onChange={(e) => {
                    const n = [...experience];
                    n[i] = {
                      ...ex,
                      bullets: e.target.value.split('\n').filter(Boolean).slice(0, 8),
                    };
                    onExperienceChange(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onExperienceChange(experience.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onExperienceChange([
                  ...experience,
                  {
                    id: generateId(),
                    company: '',
                    title: '',
                    location: '',
                    start_date: '',
                    end_date: null,
                    is_current: false,
                    bullets: [],
                    description: null,
                  },
                ])
              }
            >
              Add experience
            </Button>
          </div>
        ) : null}

        {tab === 'education' ? (
          <div className="space-y-4">
            {education.map((ed, i) => (
              <div key={ed.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="sm:col-span-2"
                    label="Institution"
                    value={ed.institution}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, institution: e.target.value };
                      onEducationChange(n);
                    }}
                  />
                  <Select
                    label="Degree"
                    value={ed.degree || 'Other'}
                    options={DEGREE_OPTIONS}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, degree: e.target.value };
                      onEducationChange(n);
                    }}
                  />
                  <Input
                    label="Field of study"
                    value={ed.field_of_study ?? ''}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, field_of_study: e.target.value };
                      onEducationChange(n);
                    }}
                  />
                  <Input
                    label="Start (month)"
                    type="month"
                    value={ed.start_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, start_date: e.target.value };
                      onEducationChange(n);
                    }}
                  />
                  <Input
                    label="End (month)"
                    type="month"
                    value={ed.end_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, end_date: e.target.value || null };
                      onEducationChange(n);
                    }}
                  />
                  <Input
                    label="GPA (optional)"
                    value={ed.gpa ?? ''}
                    onChange={(e) => {
                      const n = [...education];
                      n[i] = { ...ed, gpa: e.target.value || null };
                      onEducationChange(n);
                    }}
                  />
                </div>
                <Textarea
                  className="mt-3"
                  label="Notes (optional)"
                  value={ed.description ?? ''}
                  onChange={(e) => {
                    const n = [...education];
                    n[i] = { ...ed, description: e.target.value || null };
                    onEducationChange(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onEducationChange(education.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onEducationChange([
                  ...education,
                  {
                    id: generateId(),
                    institution: '',
                    degree: "Bachelor's",
                    field_of_study: '',
                    start_date: '',
                    end_date: null,
                    gpa: null,
                    description: null,
                  },
                ])
              }
            >
              Add education
            </Button>
          </div>
        ) : null}

        {tab === 'skills' ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted)]">
              Group skills by category (e.g. technical, tools). These appear as labeled chips in many templates.
            </p>
            {skills.map((g, i) => (
              <div key={g.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <Select
                  label="Category label"
                  value={g.category}
                  options={SKILL_CATEGORY_OPTIONS}
                  onChange={(e) => {
                    const n = [...skills];
                    n[i] = { ...g, category: e.target.value as SkillGroup['category'] };
                    onSkillsChange(n);
                  }}
                />
                <Textarea
                  className="mt-3"
                  label="Skills (one per line)"
                  value={g.items.join('\n')}
                  onChange={(e) => {
                    const n = [...skills];
                    n[i] = {
                      ...g,
                      items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    };
                    onSkillsChange(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onSkillsChange(skills.filter((_, j) => j !== i))}
                >
                  Remove group
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onSkillsChange([
                  ...skills,
                  { id: generateId(), category: 'technical', items: [] },
                ])
              }
            >
              Add skill group
            </Button>
          </div>
        ) : null}

        {tab === 'projects' ? (
          <div className="space-y-4">
            {projects.map((p, i) => (
              <div key={p.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <Input
                  label="Project name"
                  value={p.name}
                  onChange={(e) => {
                    const n = [...projects];
                    n[i] = { ...p, name: e.target.value };
                    onProjectsChange(n);
                  }}
                />
                <Textarea
                  className="mt-3"
                  label="Description"
                  value={p.description ?? ''}
                  onChange={(e) => {
                    const n = [...projects];
                    n[i] = { ...p, description: e.target.value };
                    onProjectsChange(n);
                  }}
                />
                <Textarea
                  className="mt-3"
                  label="Tech stack (one per line)"
                  value={(p.tech_stack ?? []).join('\n')}
                  onChange={(e) => {
                    const n = [...projects];
                    n[i] = {
                      ...p,
                      tech_stack: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                    };
                    onProjectsChange(n);
                  }}
                />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="URL (optional)"
                    value={p.url ?? ''}
                    onChange={(e) => {
                      const n = [...projects];
                      n[i] = { ...p, url: e.target.value || null };
                      onProjectsChange(n);
                    }}
                  />
                  <Input
                    label="Start (month)"
                    type="month"
                    value={p.start_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...projects];
                      n[i] = { ...p, start_date: e.target.value || null };
                      onProjectsChange(n);
                    }}
                  />
                  <Input
                    label="End (month)"
                    type="month"
                    value={p.end_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...projects];
                      n[i] = { ...p, end_date: e.target.value || null };
                      onProjectsChange(n);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onProjectsChange(projects.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onProjectsChange([
                  ...projects,
                  {
                    id: generateId(),
                    name: '',
                    description: '',
                    tech_stack: [],
                    url: null,
                    start_date: null,
                    end_date: null,
                  },
                ])
              }
            >
              Add project
            </Button>
          </div>
        ) : null}

        {tab === 'languages' ? (
          <div className="space-y-4">
            {languages.map((lang, i) => (
              <div key={lang.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Language"
                    value={lang.language}
                    onChange={(e) => {
                      const n = [...languages];
                      n[i] = { ...lang, language: e.target.value };
                      onLanguagesChange(n);
                    }}
                  />
                  <Select
                    label="Proficiency"
                    value={lang.proficiency}
                    options={PROFICIENCY_OPTIONS}
                    onChange={(e) => {
                      const n = [...languages];
                      n[i] = {
                        ...lang,
                        proficiency: e.target.value as LanguageEntry['proficiency'],
                      };
                      onLanguagesChange(n);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onLanguagesChange(languages.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onLanguagesChange([
                  ...languages,
                  { id: generateId(), language: '', proficiency: 'fluent' },
                ])
              }
            >
              Add language
            </Button>
          </div>
        ) : null}

        {tab === 'certifications' ? (
          <div className="space-y-4">
            {certifications.map((c, i) => (
              <div key={c.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="sm:col-span-2"
                    label="Certification name"
                    value={c.name}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[i] = { ...c, name: e.target.value };
                      onCertificationsChange(n);
                    }}
                  />
                  <Input
                    label="Issuer"
                    value={c.issuer ?? ''}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[i] = { ...c, issuer: e.target.value };
                      onCertificationsChange(n);
                    }}
                  />
                  <Input
                    label="Issue date"
                    type="month"
                    value={c.issue_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[i] = { ...c, issue_date: e.target.value };
                      onCertificationsChange(n);
                    }}
                  />
                  <Input
                    label="Expiry (optional)"
                    type="month"
                    value={c.expiry_date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[i] = { ...c, expiry_date: e.target.value || null };
                      onCertificationsChange(n);
                    }}
                  />
                  <Input
                    className="sm:col-span-2"
                    label="Credential URL (optional)"
                    value={c.url ?? ''}
                    onChange={(e) => {
                      const n = [...certifications];
                      n[i] = { ...c, url: e.target.value || null };
                      onCertificationsChange(n);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onCertificationsChange(certifications.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onCertificationsChange([
                  ...certifications,
                  {
                    id: generateId(),
                    name: '',
                    issuer: '',
                    issue_date: '',
                    expiry_date: null,
                    url: null,
                  },
                ])
              }
            >
              Add certification
            </Button>
          </div>
        ) : null}

        {tab === 'awards' ? (
          <div className="space-y-4">
            {awards.map((a, i) => (
              <div key={a.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="sm:col-span-2"
                    label="Title"
                    value={a.title}
                    onChange={(e) => {
                      const n = [...awards];
                      n[i] = { ...a, title: e.target.value };
                      onAwardsChange(n);
                    }}
                  />
                  <Input
                    label="Issuer / organization"
                    value={a.issuer ?? ''}
                    onChange={(e) => {
                      const n = [...awards];
                      n[i] = { ...a, issuer: e.target.value };
                      onAwardsChange(n);
                    }}
                  />
                  <Input
                    label="Date (month)"
                    type="month"
                    value={a.date?.slice(0, 7) ?? ''}
                    onChange={(e) => {
                      const n = [...awards];
                      n[i] = { ...a, date: e.target.value };
                      onAwardsChange(n);
                    }}
                  />
                </div>
                <Textarea
                  className="mt-3"
                  label="Description (optional)"
                  value={a.description ?? ''}
                  onChange={(e) => {
                    const n = [...awards];
                    n[i] = { ...a, description: e.target.value || null };
                    onAwardsChange(n);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onAwardsChange(awards.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                onAwardsChange([
                  ...awards,
                  {
                    id: generateId(),
                    title: '',
                    issuer: '',
                    date: '',
                    description: null,
                  },
                ])
              }
            >
              Add award
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
