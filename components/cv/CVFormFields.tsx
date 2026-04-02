'use client';

import { useState } from 'react';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
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
  EntryLink,
  ExperienceEntry,
  LanguageEntry,
  ProfileLink,
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
} from '@/types';
import { CVPhotoField } from '@/components/cv/CVPhotoField';
import { CVSectionVisibilityPanel } from '@/components/cv/CVSectionVisibilityPanel';
import { CVRewriteWithAIModal } from '@/components/cv/CVRewriteWithAIModal';
import { CvAtsPolishButton } from '@/components/cv/CvAtsPolishButton';
import { TemplateThumbnail } from '@/components/cv/TemplateThumbnail';
import { cn, generateId } from '@/lib/utils';
import { CV_FORM_CARD as FORM_CARD } from '@/lib/cv-editor-styles';

export type CVFormTab =
  | 'design'
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

const SWATCHES = ['#6C63FF', '#00D4A8', '#2563EB', '#7c3aed', '#dc2626', '#0f172a', '#10b981', '#f59e0b'];
const FONTS = ['Inter', 'Manrope', 'DM Sans', 'Lora', 'Outfit', 'Roboto'];

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
  github_url: string;
  onGithubUrl: (v: string) => void;
  links: ProfileLink[];
  onLinksChange: (v: ProfileLink[]) => void;
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
  /** When true, horizontal tab pills are hidden (e.g. when using a side nav). */
  hideTabBar?: boolean;
  /** When true, the CVSectionVisibilityPanel is omitted. */
  hideVisibilityPanel?: boolean;
  highlightedKeywords?: string[];
  atsBySection?: Record<string, { score: number; suggestions: string[] }>;
  templates?: any[]; // Using any for brevity or import CVTemplate if preferred
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
            className="rounded-sm bg-[var(--color-accent-gold)]/35 px-0.5 text-inherit"
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
  { id: 'design', label: 'Layout & Design' },
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
    github_url,
    onGithubUrl,
    links,
    onLinksChange,
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
    hideTabBar,
    hideVisibilityPanel,
    highlightedKeywords,
    atsBySection,
    templates = [],
    selectedTemplateId,
    onTemplateChange,
    accent = '#6C63FF',
    onAccentChange,
    fontFamily = 'Inter',
    onFontFamilyChange,
    coreVersions = [],
    selectedCoreCvId,
    onSelectedCoreCvIdChange,
    coreVersionsLoading = false,
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
    <div className="space-y-5">
      {!hideVisibilityPanel && (
        <div className={FORM_CARD}>
          <CVSectionVisibilityPanel
            visibility={sectionVisibility}
            onChange={onSectionVisibilityChange}
          />
        </div>
      )}
      {hideTabBar ? null : <Tabs value={tab} onChange={onTabChange} tabs={visibleTabs} />}
      <div className="pt-4">
        {activeAts ? (
          <div className="mb-4 rounded-xl border border-[var(--color-primary-200)]/40 bg-[var(--color-primary-100)]/50 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-400)]">
                ATS suggestion
              </p>
              <span className="rounded-badge border border-[var(--color-primary-200)] bg-[var(--color-primary-100)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-primary-400)]">
                {activeAts.score}/100
              </span>
            </div>
            {activeAts.suggestions.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--color-text-primary)]">
                {activeAts.suggestions.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-muted)]">This section is already ATS-friendly.</p>
            )}
          </div>
        ) : null}

        {tab === 'design' ? (
          <div className="space-y-6">
            {/* Header */}
            <div className={cn("mb-6 flex items-center gap-3", FORM_CARD)}>
              <div className="rounded-xl bg-[var(--color-primary-100)] p-2.5 text-[var(--color-primary-400)]">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Layout & Style</h2>
                <p className="text-sm text-[var(--color-muted)]">Configure your CV's visual identity and structure.</p>
              </div>
            </div>

            {/* Template Selection */}
            <div className={FORM_CARD}>
              <p className="mb-4 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-xs">
                Select Template
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onTemplateChange?.(template.id)}
                    className={cn(
                      'group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all duration-300',
                      selectedTemplateId === template.id
                        ? 'border-[var(--color-primary-400)] shadow-lg shadow-[var(--color-primary-400)]/20'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                    )}
                  >
                    <TemplateThumbnail
                      templateId={template.id}
                      accent={accent}
                      name={template.name}
                      className="absolute inset-0 h-full w-full grayscale-[0.1] opacity-90 transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent flex flex-col justify-end p-3 transition-opacity duration-300 group-hover:from-black/90">
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                        selectedTemplateId === template.id ? "text-[var(--color-primary-400)]" : "text-white"
                      )}>
                        {template.name}
                      </p>
                      <p className="text-[8px] text-white/80">{template.category}</p>
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="absolute top-2 right-2 rounded-full bg-[var(--color-primary-400)] p-1">
                        <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Typography & Color */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={FORM_CARD}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Accent Color
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-background)] transition-all duration-300 transform hover:scale-110',
                        accent === color ? 'ring-[var(--color-primary-400)]' : 'ring-transparent'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => onAccentChange?.(color)}
                    />
                  ))}
                </div>
              </div>

              <div className={FORM_CARD}>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Typography
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {FONTS.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => onFontFamilyChange?.(font)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
                        fontFamily === font
                          ? 'border-[var(--color-primary-400)]/50 bg-[var(--color-primary-100)]/40 font-semibold text-[var(--color-text-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]'
                      )}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Layout Settings */}
            <div className={FORM_CARD}>
              <div className="mb-4">
                 <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider text-xs">Section Visibility</h3>
                 <p className="text-xs text-[var(--color-muted)] mt-1">Configure which sections appear on your final CV.</p>
              </div>
              <CVSectionVisibilityPanel
                visibility={sectionVisibility}
                onChange={onSectionVisibilityChange}
              />
            </div>

            <div className={FORM_CARD}>
               <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">Pro Tip</p>
               <p className="text-sm text-[var(--color-muted)]">
                 Hiding a section here only removes it from the exported PDF and the live preview. Your data remains safe and can be re-enabled at any time.
               </p>
            </div>
          </div>
        ) : null}

        {tab === 'header' ? (
          <div className={cn('space-y-4', FORM_CARD)}>
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
              label="GitHub URL"
              value={github_url}
              onChange={(e) => onGithubUrl(e.target.value)}
            />
            </div>
            {/* ── Additional links ──────────────────────────────── */}
            <div className="col-span-2">
              <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">Additional links</p>
              <p className="mb-3 text-xs text-[var(--color-muted)]">Portfolio, website, Behance, Dribbble, blog, Twitter/X, etc. — any links beyond LinkedIn &amp; GitHub.</p>
              <div className="space-y-2">
                {links.map((link, li) => (
                  <div key={link.id} className="flex items-end gap-2">
                    <Input
                      label={li === 0 ? 'Label' : undefined}
                      placeholder="e.g. Portfolio, Behance…"
                      value={link.label}
                      onChange={(e) => {
                        const next = [...links];
                        next[li] = { ...link, label: e.target.value };
                        onLinksChange(next);
                      }}
                      className="w-36 shrink-0"
                    />
                    <Input
                      label={li === 0 ? 'URL' : undefined}
                      placeholder="https://…"
                      value={link.url}
                      onChange={(e) => {
                        const next = [...links];
                        next[li] = { ...link, url: e.target.value };
                        onLinksChange(next);
                      }}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-0.5 shrink-0"
                      onClick={() => onLinksChange(links.filter((_, j) => j !== li))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() =>
                  onLinksChange([
                    ...links,
                    { id: generateId(), label: '', url: '' },
                  ])
                }
              >
                + Add link
              </Button>
            </div>
            <Textarea
              label="Full address (optional)"
              value={address}
              onChange={(e) => onAddress(e.target.value)}
              placeholder="Street, city, postal code, country"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <CvAtsPolishButton
                disabled={!address?.trim()}
                onClick={() =>
                  setRewriteTarget({
                    section: 'Header',
                    inputLabel: 'Full address',
                    sourceText: address ?? '',
                    onApply: onAddress,
                  })
                }
              />
            </div>
          </div>
        ) : null}

        {tab === 'summary' ? (
          <div className={cn('space-y-3', FORM_CARD)}>
            <Textarea
              className="min-h-[140px]"
              label="Summary"
              maxLength={2000}
              value={summary}
              onChange={(e) => onSummary(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <CvAtsPolishButton
                disabled={!summary?.trim()}
                onClick={() =>
                  setRewriteTarget({
                    section: 'Summary',
                    inputLabel: 'Summary',
                    sourceText: summary ?? '',
                    onApply: onSummary,
                  })
                }
              />
            </div>
            {kw.length > 0 && summary && (
              <div className="rounded-btn border border-[var(--color-accent-gold)]/25 bg-[var(--color-accent-gold)]/10 p-3">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-gold)]">Preview with highlights</span>
                <p className="mt-1 text-sm text-[var(--color-text-primary)]">
                  <HighlightedText text={summary} keywords={kw} />
                </p>
              </div>
            )}
          </div>
        ) : null}

        {tab === 'experience' ? (
          <div className="space-y-4">
            {experience.map((ex, i) => (
              <div key={ex.id} className={FORM_CARD}>
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
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!(ex.description ?? '').trim()}
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
                  />
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Bullets</p>
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
                        <CvAtsPolishButton
                          disabled={!bullet.trim()}
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
                        />
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
                  <div className="mt-2 space-y-1 rounded-btn border border-[var(--color-accent-gold)]/25 bg-[var(--color-accent-gold)]/10 p-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-accent-gold)]">Preview with highlights</span>
                    <ul className="list-inside list-disc space-y-0.5 text-sm text-[var(--color-text-primary)]">
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
              <div key={ed.id} className={FORM_CARD}>
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!(ed.description ?? '').trim()}
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
                  />
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
              <div key={g.id} className={FORM_CARD}>
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
                  className="mt-3 min-h-[120px]"
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!g.items.join('\n').trim()}
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Skills',
                        inputLabel: `${g.category} skills (one per line)`,
                        sourceText: g.items.join('\n'),
                        onApply: (value) => {
                          const n = [...skills];
                          n[i] = {
                            ...g,
                            items: value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          onSkillsChange(n);
                        },
                      })
                    }
                  />
                </div>
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
                              ? 'rounded-badge border border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-accent-gold)]'
                              : 'rounded-badge border border-[var(--color-border)] bg-white/[0.06] px-2 py-0.5 text-xs text-[var(--color-muted)]'
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
              <div key={p.id} className={FORM_CARD}>
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!(p.description ?? '').trim()}
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
                  />
                </div>
                <Textarea
                  className="mt-3 min-h-[88px]"
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!(p.tech_stack ?? []).join('\n').trim()}
                    onClick={() =>
                      setRewriteTarget({
                        section: 'Projects',
                        inputLabel: `${p.name || 'Project'} tech stack (one per line)`,
                        sourceText: (p.tech_stack ?? []).join('\n'),
                        onApply: (value) => {
                          const n = [...projects];
                          n[i] = {
                            ...p,
                            tech_stack: value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          onProjectsChange(n);
                        },
                      })
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                {/* Project links (GitHub, Live Demo, etc.) */}
                <div className="mt-3">
                  <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">Links</p>
                  <div className="space-y-2">
                    {(p.links ?? []).map((lnk: EntryLink, li: number) => (
                      <div key={li} className="flex items-end gap-2">
                        <Input
                          label={li === 0 ? 'Label' : undefined}
                          placeholder="e.g. GitHub, Live Demo…"
                          value={lnk.label}
                          onChange={(e) => {
                            const n = [...projects];
                            const nextLinks = [...(p.links ?? [])];
                            nextLinks[li] = { ...lnk, label: e.target.value };
                            n[i] = { ...p, links: nextLinks };
                            onProjectsChange(n);
                          }}
                          className="w-36 shrink-0"
                        />
                        <Input
                          label={li === 0 ? 'URL' : undefined}
                          placeholder="https://…"
                          value={lnk.url}
                          onChange={(e) => {
                            const n = [...projects];
                            const nextLinks = [...(p.links ?? [])];
                            nextLinks[li] = { ...lnk, url: e.target.value };
                            n[i] = { ...p, links: nextLinks };
                            onProjectsChange(n);
                          }}
                          className="min-w-0 flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mb-0.5 shrink-0"
                          onClick={() => {
                            const n = [...projects];
                            n[i] = { ...p, links: (p.links ?? []).filter((_, j) => j !== li) };
                            onProjectsChange(n);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const n = [...projects];
                      n[i] = { ...p, links: [...(p.links ?? []), { label: '', url: '' }] };
                      onProjectsChange(n);
                    }}
                  >
                    + Add link
                  </Button>
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
                    links: [],
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
              <div key={lang.id} className={FORM_CARD}>
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
              <div key={c.id} className={FORM_CARD}>
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
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">Credential links (optional)</p>
                    <div className="space-y-2">
                      {(c.links ?? []).map((lnk: EntryLink, li: number) => (
                        <div key={li} className="flex items-end gap-2">
                          <Input
                            label={li === 0 ? 'Label' : undefined}
                            placeholder="e.g. Credential, Badge…"
                            value={lnk.label}
                            onChange={(e) => {
                              const n = [...certifications];
                              const nextLinks = [...(c.links ?? [])];
                              nextLinks[li] = { ...lnk, label: e.target.value };
                              n[i] = { ...c, links: nextLinks };
                              onCertificationsChange(n);
                            }}
                            className="w-36 shrink-0"
                          />
                          <Input
                            label={li === 0 ? 'URL' : undefined}
                            placeholder="https://…"
                            value={lnk.url}
                            onChange={(e) => {
                              const n = [...certifications];
                              const nextLinks = [...(c.links ?? [])];
                              nextLinks[li] = { ...lnk, url: e.target.value };
                              n[i] = { ...c, links: nextLinks };
                              onCertificationsChange(n);
                            }}
                            className="min-w-0 flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mb-0.5 shrink-0"
                            onClick={() => {
                              const n = [...certifications];
                              n[i] = { ...c, links: (c.links ?? []).filter((_, j) => j !== li) };
                              onCertificationsChange(n);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const n = [...certifications];
                        n[i] = { ...c, links: [...(c.links ?? []), { label: '', url: '' }] };
                        onCertificationsChange(n);
                      }}
                    >
                      + Add link
                    </Button>
                  </div>
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
                    links: [],
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
              <div key={r.id} className={FORM_CARD}>
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
              <div key={a.id} className={FORM_CARD}>
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
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <CvAtsPolishButton
                    disabled={!(a.description ?? '').trim()}
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
                  />
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
