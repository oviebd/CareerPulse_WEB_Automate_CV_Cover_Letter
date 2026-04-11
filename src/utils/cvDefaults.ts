import { TEMPLATE_CONFIGS } from '../config/templateConfig';
import type {
  CVData,
  Project,
  Publication,
  TemplateId,
  WorkExperience,
} from '../types/cv.types';

const ALL_TEMPLATE_IDS = new Set<string>([
  'classic',
  'modern',
  'academic',
  'technical',
  'minimal',
  'creative',
  'entry-level',
  'healthcare',
]);

/** Map retired template ids (DB / bookmarks) to the unified catalog. */
export const LEGACY_TEMPLATE_ID_MAP: Record<string, TemplateId> = {
  sidebar: 'modern',
  'bold-header': 'creative',
  'two-column': 'technical',
  executive: 'minimal',
  apex: 'modern',
  nova: 'technical',
};

export function normalizeTemplateId(id: string | null | undefined): TemplateId {
  const raw = (id ?? 'classic').trim();
  const mapped = LEGACY_TEMPLATE_ID_MAP[raw] ?? raw;
  if (ALL_TEMPLATE_IDS.has(mapped)) return mapped as TemplateId;
  return 'classic';
}

function sectionHasContent(key: string, d: CVData): boolean {
  switch (key) {
    case 'personal':
      return Boolean(
        d.personal.fullName.trim() ||
          d.personal.email.trim() ||
          d.personal.phone.trim()
      );
    case 'summary':
      return Boolean(d.summary?.trim());
    case 'experience':
      return (d.experience ?? []).length > 0;
    case 'education':
      return (d.education ?? []).length > 0;
    case 'skills':
      return (d.skills ?? []).some((s) => (s.items ?? []).length > 0);
    case 'projects':
      return (d.projects ?? []).length > 0;
    case 'publications':
      return (d.publications ?? []).length > 0;
    case 'research':
      return (d.research ?? []).length > 0;
    case 'certifications':
      return (d.certifications ?? []).length > 0;
    case 'awards':
      return (d.awards ?? []).length > 0;
    case 'volunteer':
      return (d.volunteer ?? []).length > 0;
    case 'languages':
      return (d.languages ?? []).length > 0;
    case 'interests':
      return (d.interests ?? []).length > 0;
    case 'references':
      return (d.references ?? []).length > 0;
    case 'custom':
      return (d.custom ?? []).length > 0;
    default:
      return true;
  }
}

export function getVisibleSections(templateId: TemplateId, cvData: CVData): string[] {
  const cfg = TEMPLATE_CONFIGS[templateId];
  const order =
    cvData.meta?.sectionOrder?.length > 0
      ? cvData.meta.sectionOrder
      : cfg.sectionOrder;
  const hide = new Set(cfg.hideIfEmpty ?? []);
  const out: string[] = [];
  for (const key of order) {
    if (hide.has(key) && !sectionHasContent(key, cvData)) continue;
    out.push(key);
  }
  return out;
}

export function createEmptyCVData(templateId: TemplateId = 'classic'): CVData {
  const cfg = TEMPLATE_CONFIGS[templateId];
  const layout =
    cfg.layout === 'two-column' ? 'two-column' : 'single-column';
  return {
    meta: {
      templateId,
      colorScheme: '#6C63FF',
      fontFamily: 'Inter',
      layout,
      pageSize: 'A4',
      showPhoto: cfg.showPhoto,
      sectionOrder: [...cfg.sectionOrder],
    },
    personal: {
      fullName: '',
      title: '',
      email: '',
      phone: '',
      location: '',
      links: {},
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    publications: [],
    research: [],
    certifications: [],
    awards: [],
    volunteer: [],
    languages: [],
    interests: [],
    references: [],
    custom: [],
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

function mapLangProf(
  p: string | undefined
): import('../types/cv.types').Language['proficiency'] {
  const x = (p ?? 'professional').toLowerCase();
  if (x === 'native' || x === 'fluent') return 'professional';
  if (x === 'advanced' || x === 'intermediate' || x === 'basic')
    return x as import('../types/cv.types').Language['proficiency'];
  if (x === 'conversational' || x === 'professional') return x;
  return 'professional';
}

/** Coerce legacy flat / partial shapes into universal `CVData` without dropping fields. */
export function migrateLegacyCVData(legacyData: unknown): CVData {
  if (!isRecord(legacyData)) {
    return createEmptyCVData('classic');
  }
  const L = legacyData;
  const xtra = isRecord(L.cv_extra) ? L.cv_extra : null;
  function coalesceArr(key: string): unknown[] {
    const top = L[key];
    const ex = xtra?.[key];
    if (Array.isArray(top) && top.length > 0) return top;
    if (Array.isArray(ex)) return ex;
    return [];
  }

  if (
    isRecord(L.personal) &&
    typeof L.meta === 'object' &&
    L.meta !== null &&
    'templateId' in (L.meta as object)
  ) {
    const base = createEmptyCVData(
      normalizeTemplateId(str((L.meta as { templateId?: string }).templateId))
    );
    return deepMergeCv(base, L as unknown as Partial<CVData>);
  }

  const templateId = normalizeTemplateId(str(L.preferred_template_id ?? L.template_id));

  const out = createEmptyCVData(templateId);

  out.meta.colorScheme = str(L.accent_color ?? L.accent ?? out.meta.colorScheme);
  out.meta.fontFamily = str(L.font_family ?? out.meta.fontFamily);
  if (L.pageSize === 'Letter' || L.pageSize === 'A4') {
    out.meta.pageSize = L.pageSize as CVData['meta']['pageSize'];
  }
  if (typeof L.watermark === 'boolean') out.watermark = L.watermark;

  out.personal.fullName = str(L.full_name);
  out.personal.title = str(L.professional_title);
  out.personal.email = str(L.email);
  out.personal.phone = str(L.phone);
  out.personal.location = str(L.location);
  out.personal.photo = str(L.photo_url) || undefined;

  out.personal.links.linkedin = str(L.linkedin_url) || undefined;
  out.personal.links.github = str(L.github_url) || undefined;

  const linksArr = Array.isArray(L.links) ? L.links : [];
  for (const raw of linksArr) {
    if (!isRecord(raw)) continue;
    const label = str(raw.label).toLowerCase();
    const url = str(raw.url);
    if (!url) continue;
    if (label.includes('portfolio') || label === 'portfolio')
      out.personal.links.portfolio = url;
    else if (label.includes('behance')) out.personal.links.behance = url;
    else if (label.includes('dribbble')) out.personal.links.dribbble = url;
    else if (
      label.includes('website') ||
      label.includes('blog') ||
      label === 'site'
    )
      out.personal.links.website = url;
  }
  const port = str(L.portfolio_url);
  const web = str(L.website_url);
  if (port) out.personal.links.portfolio = out.personal.links.portfolio ?? port;
  if (web) out.personal.links.website = out.personal.links.website ?? web;

  out.summary = str(L.summary);
  out.postalAddress = str(L.address) || undefined;
  if (isRecord(L.section_visibility)) {
    out.sectionVisibility = {
      ...out.sectionVisibility,
      ...(L.section_visibility as Record<string, boolean>),
    };
  }

  const ex = Array.isArray(L.experience) ? L.experience : [];
  out.experience = ex.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `exp-${i}`,
        company: '',
        role: '',
        type: 'full-time' as const,
        location: '',
        remote: false,
        startDate: '',
        endDate: '',
        current: false,
        bullets: [],
      };
    }
    const r = row;
    return {
      id: str(r.id) || `exp-${i}`,
      company: str(r.company),
      role: str(r.role ?? r.title),
      type: (r.type as WorkExperience['type'] | undefined) ?? 'full-time',
      location: str(r.location),
      remote: Boolean(r.remote),
      startDate: str(r.startDate ?? r.start_date),
      endDate: str(r.endDate ?? r.end_date ?? ''),
      current: Boolean(r.current ?? r.is_current),
      bullets: Array.isArray(r.bullets)
        ? r.bullets.map((x) => str(x))
        : r.description
          ? [str(r.description)]
          : [],
      technologies: Array.isArray(r.technologies)
        ? r.technologies.map((x) => str(x))
        : undefined,
      highlights: r.highlights ? str(r.highlights) : undefined,
    };
  });

  const ed = Array.isArray(L.education) ? L.education : [];
  out.education = ed.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `edu-${i}`,
        institution: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false,
      };
    }
    const r = row;
    return {
      id: str(r.id) || `edu-${i}`,
      institution: str(r.institution),
      degree: str(r.degree),
      field: str(r.field ?? r.field_of_study),
      startDate: str(r.startDate ?? r.start_date),
      endDate: str(r.endDate ?? r.end_date ?? ''),
      current: Boolean(r.current),
      gpa: r.gpa ? str(r.gpa) : undefined,
      thesis: r.thesis ? str(r.thesis) : undefined,
      advisor: r.advisor ? str(r.advisor) : undefined,
      coursework: Array.isArray(r.coursework)
        ? r.coursework.map((x) => str(x))
        : undefined,
      honors: Array.isArray(r.honors)
        ? r.honors.map((x) => str(x))
        : undefined,
    };
  });

  const sk = Array.isArray(L.skills) ? L.skills : [];
  out.skills = sk.map((row, i) => {
    if (!isRecord(row)) {
      return { id: `sk-${i}`, category: 'Skills', items: [] };
    }
    const r = row;
    const itemsRaw = Array.isArray(r.items) ? r.items : [];
    const items = itemsRaw.map((it, j) => {
      if (typeof it === 'string') return { name: it };
      if (isRecord(it)) {
        return {
          name: str(it.name),
          level: it.level as import('../types/cv.types').SkillItem['level'],
          showBar: Boolean(it.showBar),
        };
      }
      return { name: String(it) };
    });
    return {
      id: str(r.id) || `sk-${i}`,
      category: str(r.category) || 'Skills',
      items,
    };
  });

  const pr = Array.isArray(L.projects) ? L.projects : [];
  out.projects = pr.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `pr-${i}`,
        name: '',
        role: '',
        description: '',
        bullets: [],
        technologies: [],
        links: [],
        featured: false,
      };
    }
    const r = row;
    let links: Project['links'] = [];
    if (Array.isArray(r.links)) {
      links = r.links
        .map((l) => {
          if (!isRecord(l)) return null;
          return { label: str(l.label) || 'Link', url: str(l.url) };
        })
        .filter(Boolean) as Project['links'];
    }
    if (!links.length && r.url) {
      links = [{ label: 'Link', url: str(r.url) }];
    }
    return {
      id: str(r.id) || `pr-${i}`,
      name: str(r.name),
      role: str(r.role) || '',
      description: str(r.description),
      bullets: Array.isArray(r.bullets) ? r.bullets.map((x) => str(x)) : [],
      technologies: Array.isArray(r.tech_stack)
        ? r.tech_stack.map((x) => str(x))
        : Array.isArray(r.technologies)
          ? r.technologies.map((x) => str(x))
          : [],
      links,
      startDate: r.startDate ? str(r.startDate) : str(r.start_date) || undefined,
      endDate: r.endDate ? str(r.endDate) : str(r.end_date) || undefined,
      featured: Boolean(r.featured),
    };
  });

  const pubs = coalesceArr('publications');
  out.publications = pubs.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `pub-${i}`,
        title: '',
        authors: [],
        journal: '',
        year: '',
        type: 'journal' as const,
        status: 'published' as const,
      };
    }
    const r = row;
    return {
      id: str(r.id) || `pub-${i}`,
      title: str(r.title),
      authors: Array.isArray(r.authors) ? r.authors.map((x) => str(x)) : [],
      journal: str(r.journal),
      year: str(r.year),
      doi: r.doi ? str(r.doi) : undefined,
      url: r.url ? str(r.url) : undefined,
      type: (r.type as Publication['type']) ?? 'journal',
      status: (r.status as Publication['status']) ?? 'published',
    };
  });

  const res = coalesceArr('research');
  out.research = res.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `res-${i}`,
        title: '',
        institution: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
      };
    }
    const r = row;
    return {
      id: str(r.id) || `res-${i}`,
      title: str(r.title),
      institution: str(r.institution),
      role: str(r.role),
      startDate: str(r.startDate),
      endDate: str(r.endDate),
      description: str(r.description),
      funding: r.funding ? str(r.funding) : undefined,
    };
  });

  const certs = Array.isArray(L.certifications) ? L.certifications : [];
  out.certifications = certs.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `cert-${i}`,
        name: '',
        issuer: '',
        date: '',
      };
    }
    const r = row;
    let url: string | undefined;
    if (Array.isArray(r.links) && r.links[0] && isRecord(r.links[0])) {
      url = str(r.links[0].url);
    } else if (r.url) url = str(r.url);
    return {
      id: str(r.id) || `cert-${i}`,
      name: str(r.name),
      issuer: str(r.issuer),
      date: str(r.date ?? r.issue_date),
      credentialId: r.credentialId ? str(r.credentialId) : undefined,
      url,
      expiry:
        r.expiry != null || r.expiry_date != null
          ? str(r.expiry ?? r.expiry_date)
          : undefined,
    };
  });

  const aw = Array.isArray(L.awards) ? L.awards : [];
  out.awards = aw.map((row, i) => {
    if (!isRecord(row)) {
      return { id: `aw-${i}`, title: '', issuer: '', date: '' };
    }
    const r = row;
    return {
      id: str(r.id) || `aw-${i}`,
      title: str(r.title),
      issuer: str(r.issuer),
      date: str(r.date),
      description: r.description ? str(r.description) : undefined,
    };
  });

  const vol = coalesceArr('volunteer');
  out.volunteer = vol.map((row, i) => {
    if (!isRecord(row)) {
      return {
        id: `vol-${i}`,
        organization: '',
        role: '',
        startDate: '',
        endDate: '',
        description: '',
      };
    }
    const r = row;
    return {
      id: str(r.id) || `vol-${i}`,
      organization: str(r.organization),
      role: str(r.role),
      startDate: str(r.startDate),
      endDate: str(r.endDate),
      description: str(r.description),
    };
  });

  const langs = Array.isArray(L.languages) ? L.languages : [];
  out.languages = langs.map((row) => {
    if (!isRecord(row)) {
      return { name: '', proficiency: 'professional' as const };
    }
    const r = row;
    return {
      name: str(r.name ?? r.language),
      proficiency: mapLangProf(str(r.proficiency)),
    };
  });

  {
    const ints = coalesceArr('interests');
    out.interests = ints.length
      ? ints.map((x) => str(x))
      : Array.isArray(L.interests)
        ? L.interests.map((x) => str(x))
        : [];
  }

  const refs = Array.isArray(L.references)
    ? L.references
    : Array.isArray(L.referrals)
      ? L.referrals
      : [];
  out.references = refs.map((row) => {
    if (!isRecord(row)) {
      return {
        name: '',
        role: '',
        company: '',
        relationship: '',
      };
    }
    const r = row;
    return {
      name: str(r.name),
      role: str(r.role ?? r.title),
      company: str(r.company),
      email: r.email ? str(r.email) : undefined,
      phone: r.phone ? str(r.phone) : undefined,
      relationship: str(r.relationship),
    };
  });

  const cust = coalesceArr('custom');
  out.custom = cust.map((row, i) => {
    if (!isRecord(row)) {
      return { id: `cust-${i}`, title: '', items: [] };
    }
    const r = row;
    const items = Array.isArray(r.items)
      ? r.items.map((it) => {
          if (!isRecord(it)) {
            return { heading: '' };
          }
          const x = it;
          return {
            heading: str(x.heading),
            subheading: x.subheading ? str(x.subheading) : undefined,
            date: x.date ? str(x.date) : undefined,
            description: x.description ? str(x.description) : undefined,
            bullets: Array.isArray(x.bullets)
              ? x.bullets.map((b) => str(b))
              : undefined,
          };
        })
      : [];
    return {
      id: str(r.id) || `cust-${i}`,
      title: str(r.title),
      items,
    };
  });

  out.meta.templateId = templateId;
  return out;
}

function deepMergeCv(base: CVData, patch: Partial<CVData>): CVData {
  return {
    ...base,
    ...patch,
    meta: { ...base.meta, ...patch.meta },
    personal: {
      ...base.personal,
      ...patch.personal,
      links: { ...base.personal.links, ...patch.personal?.links },
    },
    sectionVisibility: { ...base.sectionVisibility, ...patch.sectionVisibility },
    postalAddress: patch.postalAddress ?? base.postalAddress,
    experience: patch.experience ?? base.experience,
    education: patch.education ?? base.education,
    skills: patch.skills ?? base.skills,
    projects: patch.projects ?? base.projects,
    publications: patch.publications ?? base.publications,
    research: patch.research ?? base.research,
    certifications: patch.certifications ?? base.certifications,
    awards: patch.awards ?? base.awards,
    volunteer: patch.volunteer ?? base.volunteer,
    languages: patch.languages ?? base.languages,
    interests: patch.interests ?? base.interests,
    references: patch.references ?? base.references,
    custom: patch.custom ?? base.custom,
  };
}
