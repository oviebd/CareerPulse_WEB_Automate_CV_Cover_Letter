import type {
  CertificationEntry,
  EducationEntry,
  EntryLink,
  ExperienceEntry,
  LanguageEntry,
  ProfileLink,
  ProjectEntry,
  ReferralEntry,
  SkillGroup,
} from '@/types';
import type { CVProfile } from '@/types';
import type { CVData } from '@/src/types/cv.types';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import { generateId } from '@/lib/utils';

/** Build universal CVData from a stored profile row + JSONB fields. */
export function profileToUniversalCV(row: CVProfile): CVData {
  const flat: Record<string, unknown> = {
    preferred_template_id: row.preferred_template_id,
    accent_color: row.accent_color,
    font_family: row.font_family,
    full_name: row.full_name,
    professional_title: row.professional_title,
    email: row.email,
    phone: row.phone,
    location: row.location,
    linkedin_url: row.linkedin_url,
    github_url: row.github_url,
    links: row.links ?? [],
    portfolio_url: row.portfolio_url,
    website_url: row.website_url,
    address: row.address,
    photo_url: row.photo_url,
    summary: row.summary,
    section_visibility: row.section_visibility,
    experience: row.experience ?? [],
    education: row.education ?? [],
    skills: row.skills ?? [],
    projects: row.projects ?? [],
    certifications: row.certifications ?? [],
    languages: row.languages ?? [],
    awards: row.awards ?? [],
    referrals: row.referrals ?? [],
    cv_extra: (row as { cv_extra?: Record<string, unknown> }).cv_extra,
  };
  return migrateLegacyCVData(flat);
}

function skillItemToString(it: { name: string; level?: string }): string {
  if (!it.level) return it.name;
  return `${it.name} (${it.level})`;
}

function mapSkillCategory(cat: string): SkillGroup['category'] {
  const x = cat.trim().toLowerCase();
  if (x === 'soft' || x === 'tools' || x === 'languages') return x;
  return 'technical';
}

function universalSkillsToGroups(skills: CVData['skills']): SkillGroup[] {
  return (skills ?? []).map((s) => ({
    id: s.id || generateId(),
    category: mapSkillCategory(s.category || 'technical'),
    items: (s.items ?? []).map((it) => skillItemToString(it)),
  }));
}

function universalExperienceToEntries(
  exp: CVData['experience']
): ExperienceEntry[] {
  return (exp ?? []).map((e) => ({
    id: e.id || generateId(),
    company: e.company,
    title: e.role,
    location: e.location || '',
    start_date: e.startDate,
    end_date: e.current ? null : e.endDate || null,
    is_current: e.current,
    bullets: e.bullets ?? [],
    description: e.highlights ?? e.bullets?.join('\n') ?? null,
  }));
}

function universalEducationToEntries(
  edu: CVData['education']
): EducationEntry[] {
  return (edu ?? []).map((e) => ({
    id: e.id || generateId(),
    institution: e.institution,
    degree: e.degree,
    field_of_study: e.field,
    start_date: e.startDate,
    end_date: e.endDate || null,
    gpa: e.gpa ?? null,
    description: e.thesis ?? null,
  }));
}

function universalProjectsToEntries(
  projects: CVData['projects']
): ProjectEntry[] {
  return (projects ?? []).map((p) => ({
    id: p.id || generateId(),
    name: p.name,
    description: p.description,
    tech_stack: p.technologies ?? [],
    links: (p.links ?? []) as EntryLink[],
    url: p.links?.[0]?.url ?? null,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
  }));
}

function universalCertsToEntries(
  certs: CVData['certifications']
): CertificationEntry[] {
  return (certs ?? []).map((c) => ({
    id: c.id || generateId(),
    name: c.name,
    issuer: c.issuer,
    issue_date: c.date,
    expiry_date: c.expiry ?? null,
    links: c.url ? [{ label: 'Credential', url: c.url }] : [],
    url: c.url ?? null,
  }));
}

function universalLangsToEntries(
  langs: CVData['languages']
): LanguageEntry[] {
  return (langs ?? []).map((l, i) => ({
    id: `lang-${i}`,
    language: l.name,
    proficiency:
      l.proficiency === 'native'
        ? 'native'
        : l.proficiency === 'basic'
          ? 'basic'
          : l.proficiency === 'conversational'
            ? 'intermediate'
            : 'fluent',
  }));
}

function universalRefsToReferrals(refs: CVData['references']): ReferralEntry[] {
  return (refs ?? []).slice(0, 2).map((r, i) => ({
    id: `ref-${i}`,
    name: r.name,
    title: r.role,
    company: r.company,
    email: r.email ?? null,
    phone: r.phone ?? null,
    relationship: r.relationship,
  }));
}

/** Persisted JSONB for sections not stored as top-level columns. */
export type CVExtraPayload = {
  publications: CVData['publications'];
  research: CVData['research'];
  volunteer: CVData['volunteer'];
  interests: CVData['interests'];
  custom: CVData['custom'];
};

export function universalToProfilePayload(cv: CVData): Record<string, unknown> {
  const personal = cv.personal;
  const extra: CVExtraPayload = {
    publications: cv.publications ?? [],
    research: cv.research ?? [],
    volunteer: cv.volunteer ?? [],
    interests: cv.interests ?? [],
    custom: cv.custom ?? [],
  };

  const links: ProfileLink[] = [];
  const pushLink = (id: string, label: string, url: string | undefined) => {
    const u = (url ?? '').trim();
    if (!u) return;
    links.push({ id, label, url: u });
  };
  pushLink('li', 'LinkedIn', personal.links.linkedin);
  pushLink('gh', 'GitHub', personal.links.github);
  pushLink('pf', 'Portfolio', personal.links.portfolio);
  pushLink('bh', 'Behance', personal.links.behance);
  pushLink('dr', 'Dribbble', personal.links.dribbble);
  pushLink('web', 'Website', personal.links.website);

  return {
    section_visibility: cv.sectionVisibility ?? {},
    address: cv.postalAddress ?? null,
    full_name: personal.fullName || null,
    professional_title: personal.title || null,
    email: personal.email || null,
    phone: personal.phone || null,
    location: personal.location || null,
    linkedin_url: personal.links.linkedin ?? null,
    github_url: personal.links.github ?? null,
    links,
    photo_url: personal.photo ?? null,
    summary: cv.summary || null,
    experience: universalExperienceToEntries(cv.experience),
    education: universalEducationToEntries(cv.education),
    skills: universalSkillsToGroups(cv.skills),
    projects: universalProjectsToEntries(cv.projects),
    certifications: universalCertsToEntries(cv.certifications),
    languages: universalLangsToEntries(cv.languages),
    awards: cv.awards.map((a) => ({
      id: a.id || generateId(),
      title: a.title,
      issuer: a.issuer,
      date: a.date,
      description: a.description ?? null,
    })),
    referrals: universalRefsToReferrals(cv.references),
    preferred_template_id: cv.meta.templateId,
    font_family: cv.meta.fontFamily,
    accent_color: cv.meta.colorScheme,
    cv_extra: extra,
  };
}
