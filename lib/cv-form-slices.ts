import type {
  AwardEntry,
  CertificationEntry,
  CVSectionVisibility,
  CustomSection,
  Education,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProfileLink,
  ProjectEntry,
  Publication,
  ReferralEntry,
  Research,
  SkillGroup,
  CVData,
  WorkExperience,
  Project,
  Certification,
  Language,
  Reference,
  Volunteer,
} from '@/types';
import { generateId } from '@/lib/utils';
import type { TemplateId } from '@/src/types/cv.types';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';

export type FormSlices = {
  full_name: string;
  professional_title: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  links: ProfileLink[];
  address: string;
  photo_url: string;
  summary: string;
  section_visibility: CVSectionVisibility;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  projects: ProjectEntry[];
  languages: LanguageEntry[];
  certifications: CertificationEntry[];
  referrals: ReferralEntry[];
  awards: AwardEntry[];
  publications: Publication[];
  research: Research[];
  volunteer: Volunteer[];
  /** One interest per line in the form; mapped to `interests: string[]` on save. */
  interestsText: string;
  custom: CustomSection[];
};

function workToExp(w: WorkExperience): ExperienceEntry {
  return {
    id: w.id,
    company: w.company,
    title: w.role,
    location: w.location || '',
    start_date: w.startDate,
    end_date: w.current ? null : w.endDate || null,
    is_current: w.current,
    bullets: w.bullets ?? [],
    description: w.highlights ?? null,
  };
}

function expToWork(e: ExperienceEntry): WorkExperience {
  return {
    id: e.id || generateId(),
    company: e.company,
    role: e.title,
    type: 'full-time',
    location: e.location ?? '',
    remote: false,
    startDate: e.start_date,
    endDate: e.end_date ?? '',
    current: e.is_current,
    bullets: e.bullets ?? [],
    technologies: [],
    highlights: e.description ?? undefined,
  };
}

function eduToEntry(e: Education): EducationEntry {
  return {
    id: e.id,
    institution: e.institution,
    degree: e.degree,
    field_of_study: e.field,
    start_date: e.startDate,
    end_date: e.endDate || null,
    gpa: e.gpa ?? null,
    description: null,
  };
}

function entryToEdu(e: EducationEntry): Education {
  return {
    id: e.id || generateId(),
    institution: e.institution,
    degree: e.degree ?? '',
    field: e.field_of_study ?? '',
    startDate: e.start_date,
    endDate: e.end_date ?? '',
    current: false,
    gpa: e.gpa ?? undefined,
  };
}

function mapSkillCat(c: string): SkillGroup['category'] {
  const x = c.toLowerCase();
  if (x === 'soft' || x === 'tools' || x === 'languages') return x;
  return 'technical';
}

function skillSecToGroup(s: import('@/types').SkillSection): SkillGroup {
  return {
    id: s.id,
    category: mapSkillCat(s.category),
    items: (s.items ?? []).map((it) =>
      it.level ? `${it.name} (${it.level})` : it.name
    ),
  };
}

function skillGroupToSec(g: SkillGroup): import('@/types').SkillSection {
  return {
    id: g.id || generateId(),
    category: g.category,
    items: (g.items ?? []).map((raw) => {
      const m = String(raw).match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        const lvl = m[2].toLowerCase();
        const level =
          lvl === 'beginner' ||
          lvl === 'intermediate' ||
          lvl === 'advanced' ||
          lvl === 'expert'
            ? lvl
            : undefined;
        return { name: m[1].trim(), level, showBar: Boolean(level) };
      }
      return { name: String(raw) };
    }),
  };
}

function projToEntry(p: Project): ProjectEntry {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    tech_stack: p.technologies ?? [],
    links: (p.links ?? []) as ProjectEntry['links'],
    url: p.links?.[0]?.url ?? null,
    start_date: p.startDate ?? null,
    end_date: p.endDate ?? null,
  };
}

function entryToProj(p: ProjectEntry): Project {
  return {
    id: p.id || generateId(),
    name: p.name,
    role: '',
    description: p.description ?? '',
    bullets: [],
    technologies: p.tech_stack ?? [],
    links: p.links ?? [],
    startDate: p.start_date ?? undefined,
    endDate: p.end_date ?? undefined,
    featured: false,
  };
}

function certToEntry(c: Certification): CertificationEntry {
  return {
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    issue_date: c.date,
    expiry_date: c.expiry ?? null,
    links: c.url ? [{ label: 'Credential', url: c.url }] : [],
    url: c.url ?? null,
  };
}

function entryToCert(c: CertificationEntry): Certification {
  return {
    id: c.id || generateId(),
    name: c.name,
    issuer: c.issuer,
    date: c.issue_date,
    expiry: c.expiry_date ?? undefined,
    url: c.url ?? c.links?.[0]?.url,
  };
}

function langToEntry(l: Language, i: number): LanguageEntry {
  const prof =
    l.proficiency === 'basic'
      ? 'basic'
      : l.proficiency === 'conversational'
        ? 'intermediate'
        : 'fluent';
  return {
    id: `lang-${i}`,
    language: l.name,
    proficiency: prof,
  };
}

function entryToLang(l: LanguageEntry): Language {
  return {
    name: l.language,
    proficiency:
      l.proficiency === 'native'
        ? 'native'
        : l.proficiency === 'basic'
          ? 'basic'
          : 'professional',
  };
}

function refToReferral(r: Reference, i: number): ReferralEntry {
  return {
    id: `ref-${i}`,
    name: r.name,
    title: r.role,
    company: r.company,
    email: r.email ?? null,
    phone: r.phone ?? null,
    relationship: r.relationship,
  };
}

function referralToRef(r: ReferralEntry): Reference {
  return {
    name: r.name,
    role: r.title ?? '',
    company: r.company ?? '',
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    relationship: r.relationship ?? '',
  };
}

export function cvDataToFormSlices(cv: CVData): FormSlices {
  const p = cv.personal;
  const links: ProfileLink[] = [];
  let n = 0;
  const add = (label: string, url: string | undefined) => {
    const u = (url ?? '').trim();
    if (!u) return;
    links.push({ id: `l-${n++}`, label, url: u });
  };
  add('Portfolio', p.links.portfolio);
  add('Behance', p.links.behance);
  add('Dribbble', p.links.dribbble);
  add('Website', p.links.website);
  add('ORCID', p.links.orcid);
  add('Google Scholar', p.links.googleScholar);
  add('ResearchGate', p.links.researchGate);

  return {
    full_name: p.fullName,
    professional_title: p.title,
    email: p.email,
    phone: p.phone,
    location: p.location,
    linkedin_url: p.links.linkedin ?? '',
    github_url: p.links.github ?? '',
    links,
    address: cv.postalAddress ?? '',
    photo_url: p.photo ?? '',
    summary: cv.summary ?? '',
    section_visibility: (cv.sectionVisibility ?? {}) as CVSectionVisibility,
    experience: (cv.experience ?? []).map(workToExp),
    education: (cv.education ?? []).map(eduToEntry),
    skills: (cv.skills ?? []).map(skillSecToGroup),
    projects: (cv.projects ?? []).map(projToEntry),
    languages: (cv.languages ?? []).map(langToEntry),
    certifications: (cv.certifications ?? []).map(certToEntry),
    referrals: (cv.references ?? []).slice(0, 2).map(refToReferral),
    awards: (cv.awards ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      issuer: a.issuer,
      date: a.date,
      description: a.description ?? null,
    })),
    publications: cv.publications ?? [],
    research: cv.research ?? [],
    volunteer: cv.volunteer ?? [],
    interestsText: (cv.interests ?? []).join('\n'),
    custom: cv.custom ?? [],
  };
}

export function formSlicesToCvData(
  prev: CVData,
  slices: FormSlices,
  design: {
    preferred_template_id: string;
    accent_color: string;
    font_family: string;
  }
): CVData {
  const tid = normalizeTemplateId(design.preferred_template_id) as TemplateId;
  const cfg = TEMPLATE_CONFIGS[tid];
  return {
    meta: {
      templateId: tid,
      colorScheme: design.accent_color,
      fontFamily: design.font_family,
      layout: cfg.layout === 'two-column' ? 'two-column' : 'single-column',
      pageSize: prev.meta.pageSize ?? 'A4',
      showPhoto: cfg.showPhoto,
      sectionOrder: [...cfg.sectionOrder],
    },
    personal: {
      fullName: slices.full_name,
      title: slices.professional_title,
      email: slices.email,
      phone: slices.phone,
      location: slices.location,
      photo: slices.photo_url || undefined,
      links: {
        linkedin: slices.linkedin_url || undefined,
        github: slices.github_url || undefined,
        portfolio: slices.links.find((l) => l.label.toLowerCase().includes('portfolio'))?.url,
        behance: slices.links.find((l) => l.label.toLowerCase().includes('behance'))?.url,
        dribbble: slices.links.find((l) => l.label.toLowerCase().includes('dribbble'))?.url,
        website: slices.links.find(
          (l) =>
            l.label.toLowerCase().includes('website') ||
            l.label.toLowerCase().includes('blog')
        )?.url,
        orcid: slices.links.find((l) => l.label.toLowerCase().includes('orcid'))?.url,
        googleScholar: slices.links.find((l) =>
          l.label.toLowerCase().includes('scholar')
        )?.url,
        researchGate: slices.links.find((l) =>
          l.label.toLowerCase().includes('researchgate')
        )?.url,
      },
    },
    postalAddress: slices.address || undefined,
    sectionVisibility: slices.section_visibility as CVData['sectionVisibility'],
    summary: slices.summary,
    experience: slices.experience.map(expToWork),
    education: slices.education.map(entryToEdu),
    skills: slices.skills.map(skillGroupToSec),
    projects: slices.projects.map(entryToProj),
    publications: slices.publications,
    research: slices.research,
    certifications: slices.certifications.map(entryToCert),
    awards: slices.awards.map((a) => ({
      id: a.id,
      title: a.title,
      issuer: a.issuer,
      date: a.date,
      description: a.description ?? undefined,
    })),
    volunteer: slices.volunteer,
    languages: slices.languages.map(entryToLang),
    interests: slices.interestsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    references: slices.referrals.map(referralToRef),
    custom: slices.custom,
    watermark: prev.watermark,
  };
}
