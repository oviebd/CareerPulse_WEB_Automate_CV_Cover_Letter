'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import type {
  AwardEntry,
  CertificationEntry,
  CVSectionVisibility,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
} from '@/types';
import { CVPhotoField } from '@/components/cv/CVPhotoField';
import { CVSectionVisibilityPanel } from '@/components/cv/CVSectionVisibilityPanel';
import { CVRewriteWithAIModal } from '@/components/cv/CVRewriteWithAIModal';
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
  | 'references'
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
  address: string;
  onAddress: (v: string) => void;
  photo_url: string;
  onPhotoUrl: (v: string | null) => void;
  summary: string;
  onSummary: (v: string) => void;
  sectionVisibility: CVSectionVisibility | undefined;
  onSectionVisibilityChange: (next: CVSectionVisibility) => void;
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
  referrals: ReferralEntry[];
  onReferralsChange: (next: ReferralEntry[]) => void;
  awards: AwardEntry[];
  onAwardsChange: (next: AwardEntry[]) => void;
  hiddenTabs?: CVFormTab[];
  highlightedKeywords?: string[];
  atsBySection?: Record<string, { score: number; suggestions: string[] }>;
};

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length || !text) return <>{text}</>;
  const pattern = keywords
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200/70 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

const TAB_DEFS: { id: CVFormTab; label: string }[] = [
  { id: 'header', label: 'Header & contact' },
  { id: 'summary', label: 'Summary' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'languages', label: 'Languages' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'references', label: 'References' },
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
    address,
    onAddress,
    photo_url,
    onPhotoUrl,
    summary,
    onSummary,
    sectionVisibility,
    onSectionVisibilityChange,
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
    referrals,
    onReferralsChange,
    awards,
    onAwardsChange,
    hiddenTabs,
    highlightedKeywords,
    atsBySection,
  } = props;

  const visibleTabs = hiddenTabs
    ? TAB_DEFS.filter((t) => !hiddenTabs.includes(t.id))
    : TAB_DEFS;
  const kw = highlightedKeywords ?? [];
  const atsSectionKeyByTab: Partial<Record<CVFormTab, string>> = {
    header: 'header',
    summary: 'summary',
    experience: 'experience',
    education: 'education',
    skills: 'skills',
    projects: 'projects',
  };
  const activeAtsSectionKey = atsSectionKeyByTab[tab];
  const activeAts = activeAtsSectionKey ? atsBySection?.[activeAtsSectionKey] : undefined;
  const [rewriteTarget, setRewriteTarget] = useState<{
    section: string;
    inputLabel: string;
    sourceText: string;
    extraContext?: string;
    onApply: (value: string) => void;
  } | null>(null);

  return (
    <div className="space-y-4">
      <CVSectionVisibilityPanel
        visibility={sectionVisibility}
        onChange={onSectionVisibilityChange}
      />
      <Tabs value={tab} onChange={onTabChange} tabs={visibleTabs} />
      <div className="pt-4">
        {activeAts ? (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                ATS suggestion
              </p>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                {activeAts.score}/100
              </span>
            </div>
            {activeAts.suggestions.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-indigo-900">
                {activeAts.suggestions.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-indigo-900">This section is already ATS-friendly.</p>
            )}
          </div>
        ) : null}

        {tab === 'header' ? (
          <div className="space-y-4">
            <CVPhotoField photoUrl={photo_url} onPhotoUrl={onPhotoUrl} />
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
            <Textarea
              label="Full address (optional)"
              value={address}
              onChange={(e) => onAddress(e.target.value)}
              placeholder="Street, city, postal code, country"
            />
          </div>
        ) : null}

        {tab === 'summary' ? (
          <div className="space-y-2">
            <Textarea
              label="Summary"
              maxLength={2000}
              value={summary}
              onChange={(e) => onSummary(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setRewriteTarget({
                    section: 'Summary',
                    inputLabel: 'Summary',
                    sourceText: summary ?? '',
                    onApply: onSummary,
                  })
                }
              >
                Rewrite with AI
              </Button>
            </div>
            {kw.length > 0 && summary && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50/50 p-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-700">Preview with highlights</span>
                <p className="mt-1 text-sm text-[var(--color-secondary)]">
                  <HighlightedText text={summary} keywords={kw} />
                </p>
              </div>
            )}
          </div>
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
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Experience',
                        inputLabel: `${ex.title || 'Role'} description`,
                        sourceText: ex.description ?? '',
                        extraContext: `Company: ${ex.company || 'N/A'}`,
                        onApply: (value) => {
                          const n = [...experience];
                          n[i] = { ...ex, description: value || null };
                          onExperienceChange(n);
                        },
                      })
                    }
                  >
                    Rewrite with AI
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-[var(--color-secondary)]">Bullets</p>
                  {ex.bullets.map((bullet, bi) => (
                    <div
                      key={`${ex.id}-bullet-${bi}`}
                      className="rounded-lg border border-[var(--color-border)] p-2"
                    >
                      <Input
                        label={`Bullet ${bi + 1}`}
                        value={bullet}
                        onChange={(e) => {
                          const n = [...experience];
                          const nextBullets = [...(ex.bullets ?? [])];
                          nextBullets[bi] = e.target.value;
                          n[i] = { ...ex, bullets: nextBullets };
                          onExperienceChange(n);
                        }}
                      />
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRewriteTarget({
                              section: 'Experience',
                              inputLabel: `${ex.title || 'Role'} bullet ${bi + 1}`,
                              sourceText: bullet,
                              extraContext: `Company: ${ex.company || 'N/A'}`,
                              onApply: (value) => {
                                const n = [...experience];
                                const nextBullets = [...(ex.bullets ?? [])];
                                nextBullets[bi] = value;
                                n[i] = { ...ex, bullets: nextBullets };
                                onExperienceChange(n);
                              },
                            })
                          }
                        >
                          Rewrite with AI
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const n = [...experience];
                            const nextBullets = (ex.bullets ?? []).filter((_, idx) => idx !== bi);
                            n[i] = { ...ex, bullets: nextBullets };
                            onExperienceChange(n);
                          }}
                        >
                          - Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={(ex.bullets ?? []).length >= 8}
                      onClick={() => {
                        const n = [...experience];
                        const nextBullets = [...(ex.bullets ?? []), ''];
                        n[i] = { ...ex, bullets: nextBullets.slice(0, 8) };
                        onExperienceChange(n);
                      }}
                    >
                      + Add bullet
                    </Button>
                  </div>
                </div>
                {kw.length > 0 && ex.bullets.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md border border-yellow-200 bg-yellow-50/50 p-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-yellow-700">Preview with highlights</span>
                    <ul className="list-inside list-disc space-y-0.5 text-sm text-[var(--color-secondary)]">
                      {ex.bullets.map((b, bi) => (
                        <li key={bi}>
                          <HighlightedText text={b} keywords={kw} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Education',
                        inputLabel: `${ed.institution || 'Education'} notes`,
                        sourceText: ed.description ?? '',
                        onApply: (value) => {
                          const n = [...education];
                          n[i] = { ...ed, description: value || null };
                          onEducationChange(n);
                        },
                      })
                    }
                  >
                    Rewrite with AI
                  </Button>
                </div>
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
                {kw.length > 0 && g.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.items.map((skill, si) => {
                      const isHighlighted = kw.some(
                        (k) => skill.toLowerCase().includes(k.toLowerCase())
                      );
                      return (
                        <span
                          key={si}
                          className={
                            isHighlighted
                              ? 'rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-900'
                              : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600'
                          }
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                )}
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
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Projects',
                        inputLabel: `${p.name || 'Project'} description`,
                        sourceText: p.description ?? '',
                        onApply: (value) => {
                          const n = [...projects];
                          n[i] = { ...p, description: value };
                          onProjectsChange(n);
                        },
                      })
                    }
                  >
                    Rewrite with AI
                  </Button>
                </div>
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

        {tab === 'references' ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-muted)]">
              Add up to two professional references (name, role, and contact optional).
            </p>
            {referrals.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    className="sm:col-span-2"
                    label="Name"
                    value={r.name}
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, name: e.target.value };
                      onReferralsChange(n);
                    }}
                  />
                  <Input
                    label="Title / role"
                    value={r.title ?? ''}
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, title: e.target.value || null };
                      onReferralsChange(n);
                    }}
                  />
                  <Input
                    label="Company"
                    value={r.company ?? ''}
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, company: e.target.value || null };
                      onReferralsChange(n);
                    }}
                  />
                  <Input
                    label="Relationship"
                    value={r.relationship ?? ''}
                    placeholder="e.g. Former manager"
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, relationship: e.target.value || null };
                      onReferralsChange(n);
                    }}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={r.email ?? ''}
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, email: e.target.value || null };
                      onReferralsChange(n);
                    }}
                  />
                  <Input
                    label="Phone"
                    value={r.phone ?? ''}
                    onChange={(e) => {
                      const n = [...referrals];
                      n[i] = { ...r, phone: e.target.value || null };
                      onReferralsChange(n);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onReferralsChange(referrals.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            ))}
            {referrals.length < 2 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  onReferralsChange([
                    ...referrals,
                    {
                      id: generateId(),
                      name: '',
                      title: null,
                      company: null,
                      email: null,
                      phone: null,
                      relationship: null,
                    },
                  ])
                }
              >
                Add reference
              </Button>
            ) : null}
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
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Awards',
                        inputLabel: `${a.title || 'Award'} description`,
                        sourceText: a.description ?? '',
                        onApply: (value) => {
                          const n = [...awards];
                          n[i] = { ...a, description: value || null };
                          onAwardsChange(n);
                        },
                      })
                    }
                  >
                    Rewrite with AI
                  </Button>
                </div>
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
      {rewriteTarget ? (
        <CVRewriteWithAIModal
          isOpen={Boolean(rewriteTarget)}
          onClose={() => setRewriteTarget(null)}
          section={rewriteTarget.section}
          inputLabel={rewriteTarget.inputLabel}
          sourceText={rewriteTarget.sourceText}
          extraContext={rewriteTarget.extraContext}
          onSelectSuggestion={(value) => rewriteTarget.onApply(value)}
        />
      ) : null}
    </div>
  );
}
