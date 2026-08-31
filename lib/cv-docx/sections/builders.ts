import type { CVData, CustomSection } from '@/src/types/cv.types';
import { Paragraph } from 'docx';
import type { DocxBlock, DocxTheme, SectionContext } from '../types';
import {
  bodyParagraph,
  bullet,
  chipParagraph,
  competenciesGrid,
  entryHeader,
  labeledLine,
  run,
  sectionHeading,
  sidebarHeading,
  skillBarBlock,
  skillDotsParagraph,
  subline,
  timelineExperienceBlock,
} from '../primitives';
import { dateRange, sectionTitleFor } from '../utils';

const RATING_LABELS = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Professional'];

function skillRatingLabel(rating: number): string {
  return RATING_LABELS[Math.min(5, Math.max(1, rating))] ?? 'Intermediate';
}

function title(ctx: SectionContext, key: string): string {
  return sectionTitleFor(key, ctx.theme.templateId);
}

export function buildSummary(ctx: SectionContext): DocxBlock[] {
  if (!ctx.cvData.summary?.trim()) return [];
  return [
    sectionHeading(ctx.theme, title(ctx, 'summary')),
    bodyParagraph(ctx.theme, ctx.cvData.summary),
  ];
}

export function buildExperience(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.experience ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'experience'))];
  for (const e of cvData.experience ?? []) {
    const dates = dateRange(e.startDate, e.endDate, e.current);
    if (theme.templateId === 'ocean-slate') {
      out.push(entryHeader(theme, e.role, dates));
      if (e.company) out.push(subline(theme, e.company));
      if (e.location) {
        out.push(subline(theme, e.remote ? `${e.location} · Remote` : e.location));
      }
      for (const b of e.bullets ?? []) out.push(bullet(theme, b));
      if (e.technologies?.length) {
        out.push(subline(theme, `Technologies: ${e.technologies.join(', ')}`));
      }
      continue;
    }
    if (theme.experienceStyle === 'timeline') {
      out.push(
        ...timelineExperienceBlock(
          theme,
          e.company,
          e.role,
          dates,
          e.bullets ?? []
        )
      );
      if (e.location) {
        out.push(
          subline(theme, e.remote ? `${e.location} · Remote` : e.location)
        );
      }
      continue;
    }
    out.push(entryHeader(theme, e.company, dates));
    if (e.role) out.push(subline(theme, e.role));
    if (e.location) {
      out.push(subline(theme, e.remote ? `${e.location} · Remote` : e.location));
    }
    for (const b of e.bullets ?? []) out.push(bullet(theme, b));
    if (e.technologies?.length) {
      out.push(subline(theme, `Technologies: ${e.technologies.join(', ')}`));
    }
  }
  return out;
}

export function buildEducation(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.education ?? []).length) return [];
  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'education'))
    : sectionHeading(theme, title(ctx, 'education'));
  const out: DocxBlock[] = [heading];
  const academic = theme.educationDetail === 'academic';
  for (const e of cvData.education ?? []) {
    const degreeLine = [e.degree, e.field].filter(Boolean).join(' · ');
    const dates = dateRange(e.startDate, e.endDate, e.current);
    if (ctx.inSidebar) {
      out.push(
        entryHeader(theme, e.institution, dates, {
          inSidebar: true,
          compact: true,
        })
      );
      if (degreeLine) out.push(subline(theme, degreeLine, undefined, { inSidebar: true }));
      if (e.gpa) out.push(subline(theme, `GPA: ${e.gpa}`, undefined, { inSidebar: true }));
      continue;
    }
    out.push(entryHeader(theme, e.institution, dates));
    if (degreeLine) out.push(subline(theme, degreeLine));
    if (e.gpa) out.push(subline(theme, `GPA: ${e.gpa}`));
    if (academic) {
      if (e.thesis) out.push(subline(theme, `Thesis: ${e.thesis}`));
      if (e.advisor) out.push(subline(theme, `Advisor: ${e.advisor}`));
      if (e.coursework?.length) {
        out.push(subline(theme, `Coursework: ${e.coursework.join(', ')}`));
      }
      if (e.honors?.length) {
        out.push(subline(theme, `Honors: ${e.honors.join(', ')}`));
      }
    }
  }
  return out;
}

export function buildSkills(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  const groups = (cvData.skills ?? []).filter((g) => (g.items ?? []).length > 0);
  if (!groups.length) return [];

  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'skills'))
    : sectionHeading(theme, title(ctx, 'skills'));
  const out: DocxBlock[] = [heading];

  if (theme.templateId === 'executive' && !ctx.inSidebar) {
    if (theme.googleDocsCompat) {
      for (const g of groups) {
        const names = (g.items ?? []).map((i) => i.name).filter(Boolean);
        if (names.length) out.push(labeledLine(theme, g.category, names.join(', ')));
      }
      return out;
    }
    out.push(
      competenciesGrid(
        theme,
        groups.map((g) => ({
          category: g.category,
          items: (g.items ?? []).map((i) => i.name).filter(Boolean),
        }))
      )
    );
    return out;
  }

  for (const g of groups) {
    const items = g.items ?? [];
    if (g.category && theme.templateId === 'ocean-slate' && !ctx.inSidebar) {
      out.push(
        subline(theme, g.category, theme.accent)
      );
    }
    if (theme.googleDocsCompat && (theme.skillDisplay === 'bars' || theme.skillDisplay === 'dots')) {
      for (const item of items) {
        if (!item.name) continue;
        const label = skillRatingLabel(item.rating ?? 3);
        out.push(subline(theme, `${item.name} — ${label}`));
      }
    } else if (theme.skillDisplay === 'bars') {
      for (const item of items) {
        if (!item.name) continue;
        out.push(
          ...skillBarBlock(theme, item.name, item.rating ?? 3, {
            inSidebar: ctx.inSidebar,
            showLabel: theme.templateId === 'ocean-slate',
          })
        );
      }
    } else if (theme.skillDisplay === 'dots') {
      for (const item of items) {
        if (!item.name) continue;
        out.push(skillDotsParagraph(theme, item.name, item.rating ?? 3));
      }
    } else if (theme.skillDisplay === 'chips') {
      const names = items.map((i) => i.name).filter(Boolean);
      if (names.length) out.push(chipParagraph(theme, names.join('  ·  ')));
    } else {
      const names = items.map((i) => i.name).filter(Boolean);
      if (names.length) out.push(labeledLine(theme, g.category, names.join(', ')));
    }
  }
  return out;
}

export function buildProjects(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.projects ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'projects'))];
  for (const p of cvData.projects ?? []) {
    out.push(entryHeader(theme, p.name, dateRange(p.startDate, p.endDate)));
    if (p.role) out.push(subline(theme, p.role));
    if (p.description) out.push(bodyParagraph(theme, p.description));
    for (const b of p.bullets ?? []) out.push(bullet(theme, b));
    if (p.technologies?.length) {
      out.push(subline(theme, `Technologies: ${p.technologies.join(', ')}`));
    }
    for (const l of p.links ?? []) {
      if (l.url) out.push(subline(theme, `${l.label}: ${l.url}`));
    }
  }
  return out;
}

export function buildPublications(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.publications ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'publications'))];
  let idx = 0;
  for (const p of cvData.publications ?? []) {
    idx += 1;
    const prefix =
      theme.publicationStyle === 'numbered' ? `[${idx}] ` : '';
    out.push(entryHeader(theme, `${prefix}${p.title}`, p.year));
    const bits = [(p.authors ?? []).join(', '), p.journal, p.year]
      .filter(Boolean)
      .join('. ');
    if (bits) out.push(subline(theme, bits));
    if (p.doi) out.push(subline(theme, `DOI: ${p.doi}`));
    if (p.url) out.push(subline(theme, p.url));
  }
  return out;
}

export function buildResearch(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.research ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'research'))];
  for (const r of cvData.research ?? []) {
    out.push(entryHeader(theme, r.title, dateRange(r.startDate, r.endDate)));
    const who = [r.role, r.institution].filter(Boolean).join(' · ');
    if (who) out.push(subline(theme, who));
    if (r.description) out.push(bodyParagraph(theme, r.description));
    if (r.funding) out.push(subline(theme, `Funding: ${r.funding}`));
  }
  return out;
}

export function buildCertifications(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.certifications ?? []).length) return [];
  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'certifications'))
    : sectionHeading(theme, title(ctx, 'certifications'));
  const out: DocxBlock[] = [heading];
  for (const c of cvData.certifications ?? []) {
    out.push(entryHeader(theme, c.name, c.date));
    const sub = [c.issuer, c.date].filter(Boolean).join(' · ');
    if (sub) out.push(subline(theme, sub));
    if (c.credentialId) out.push(subline(theme, `Credential ID: ${c.credentialId}`));
    if (c.expiry) out.push(subline(theme, `Valid until: ${c.expiry}`));
  }
  return out;
}

export function buildAwards(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.awards ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'awards'))];
  for (const a of cvData.awards ?? []) {
    out.push(entryHeader(theme, a.title, a.date));
    if (a.issuer) out.push(subline(theme, a.issuer));
    if (a.description) out.push(bodyParagraph(theme, a.description));
  }
  return out;
}

export function buildVolunteer(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.volunteer ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title(ctx, 'volunteer'))];
  for (const v of cvData.volunteer ?? []) {
    out.push(
      entryHeader(theme, v.organization, dateRange(v.startDate, v.endDate))
    );
    if (v.role) out.push(subline(theme, v.role));
    if (v.description) out.push(bodyParagraph(theme, v.description));
  }
  return out;
}

export function buildLanguages(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  const rows = (cvData.languages ?? []).filter((l) => l.name);
  if (!rows.length) return [];
  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'languages'))
    : sectionHeading(theme, title(ctx, 'languages'));
  const out: DocxBlock[] = [heading];
  for (const l of rows) {
    const prof = l.proficiency
      ? l.proficiency.charAt(0).toUpperCase() + l.proficiency.slice(1)
      : '';
    if (ctx.inSidebar) {
      out.push(
        subline(theme, prof ? `${l.name} · ${prof}` : l.name, undefined, {
          inSidebar: true,
        })
      );
    } else {
      out.push(labeledLine(theme, l.name, prof));
    }
  }
  return out;
}

export function buildInterests(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  const items = (cvData.interests ?? []).filter(Boolean);
  if (!items.length) return [];
  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'interests'))
    : sectionHeading(theme, title(ctx, 'interests'));
  return [
    heading,
    new Paragraph({
      spacing: { after: 60 },
      children: [
        run(theme, items.join('  ·  '), {
          size: 18,
          color: ctx.inSidebar ? theme.sidebarText : theme.mutedColor,
        }),
      ],
    }),
  ];
}

export function buildReferences(ctx: SectionContext): DocxBlock[] {
  const { cvData, theme } = ctx;
  if (!(cvData.references ?? []).length) return [];
  const heading = ctx.inSidebar
    ? sidebarHeading(theme, title(ctx, 'references'))
    : sectionHeading(theme, title(ctx, 'references'));
  const out: DocxBlock[] = [heading];
  for (const r of cvData.references ?? []) {
    if (ctx.inSidebar) {
      out.push(entryHeader(theme, r.name, '', { inSidebar: true, compact: true }));
      const sub = [r.role, r.company].filter(Boolean).join(', ');
      if (sub) out.push(subline(theme, sub, undefined, { inSidebar: true }));
      if (r.email) out.push(subline(theme, r.email, undefined, { inSidebar: true }));
      continue;
    }
    out.push(entryHeader(theme, r.name, ''));
    const sub = [r.role, r.company].filter(Boolean).join(' · ');
    if (sub) out.push(subline(theme, sub));
    if (r.email) out.push(subline(theme, r.email));
    if (r.phone) out.push(subline(theme, r.phone));
    if (r.relationship) out.push(subline(theme, r.relationship));
  }
  return out;
}

export function buildCustom(cs: CustomSection, theme: DocxTheme): DocxBlock[] {
  const out: DocxBlock[] = [sectionHeading(theme, cs.title)];
  for (const it of cs.items ?? []) {
    out.push(entryHeader(theme, it.heading, it.date ?? ''));
    if (it.subheading) out.push(subline(theme, it.subheading));
    if (it.description) out.push(bodyParagraph(theme, it.description));
    for (const b of it.bullets ?? []) out.push(bullet(theme, b));
  }
  return out;
}

const BUILDERS: Record<
  string,
  (ctx: SectionContext) => DocxBlock[]
> = {
  summary: buildSummary,
  experience: buildExperience,
  education: buildEducation,
  skills: buildSkills,
  projects: buildProjects,
  publications: buildPublications,
  research: buildResearch,
  certifications: buildCertifications,
  awards: buildAwards,
  volunteer: buildVolunteer,
  languages: buildLanguages,
  interests: buildInterests,
  references: buildReferences,
};

export function buildSection(
  key: string,
  ctx: SectionContext
): DocxBlock[] {
  if (key === 'personal') return [];
  if (key === 'custom') {
    return (ctx.cvData.custom ?? []).flatMap((cs) =>
      buildCustom(cs, ctx.theme)
    );
  }
  const fn = BUILDERS[key];
  return fn ? fn(ctx) : [];
}

export function contactLine(cvData: CVData): string {
  const p = cvData.personal;
  const bits: string[] = [];
  if (p.email) bits.push(p.email);
  if (p.phone) bits.push(p.phone);
  if (p.location) bits.push(p.location);
  if (cvData.postalAddress) bits.push(cvData.postalAddress);
  return bits.join(' · ');
}

export function linksLine(cvData: CVData): string {
  const l = cvData.personal.links ?? {};
  const bits: string[] = [];
  if (l.linkedin) bits.push(`LinkedIn: ${l.linkedin}`);
  if (l.github) bits.push(`GitHub: ${l.github}`);
  if (l.portfolio) bits.push(`Portfolio: ${l.portfolio}`);
  if (l.website) bits.push(`Website: ${l.website}`);
  if (l.orcid) bits.push(`ORCID: ${l.orcid}`);
  if (l.googleScholar) bits.push(`Scholar: ${l.googleScholar}`);
  if (l.researchGate) bits.push(`ResearchGate: ${l.researchGate}`);
  if (l.behance) bits.push(`Behance: ${l.behance}`);
  if (l.dribbble) bits.push(`Dribbble: ${l.dribbble}`);
  return bits.join(' · ');
}
