import type {
  AwardEntry,
  CertificationEntry,
  EducationEntry,
  EntryLink,
  ExperienceEntry,
  LanguageEntry,
  ProfileLink,
  ProjectEntry,
  SkillCategory,
} from '@/types';
import { generateId } from '@/lib/utils';

function id<T extends { id?: string }>(row: T): T & { id: string } {
  return {
    ...row,
    id: row.id && String(row.id).length >= 8 ? String(row.id) : generateId(),
  };
}

/** Derive a human-readable label from a URL (used during legacy migration). */
function labelFromUrl(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('behance.net')) return 'Behance';
    if (host.includes('dribbble.com')) return 'Dribbble';
    if (host.includes('npmjs.com')) return 'npm';
    if (host.includes('pypi.org')) return 'PyPI';
    if (host.includes('coursera.org')) return 'Coursera';
    if (host.includes('udemy.com')) return 'Udemy';
    if (host.includes('credly.com')) return 'Credly';
    return host;
  } catch {
    return 'Link';
  }
}

/** Ensure an EntryLink array is populated, migrating old `url` string if needed. */
function normalizeEntryLinks(
  links: unknown,
  legacyUrl: string | null | undefined,
  fallbackLabel = 'Link'
): EntryLink[] {
  if (Array.isArray(links) && links.length > 0) {
    return (links as EntryLink[]).filter((l) => l?.url?.trim());
  }
  if (legacyUrl?.trim()) {
    return [{ label: labelFromUrl(legacyUrl) || fallbackLabel, url: legacyUrl.trim() }];
  }
  return [];
}

/** Ensure a ProfileLink array is populated, migrating old `portfolio_url` / `website_url`. */
function normalizeProfileLinks(
  links: unknown,
  portfolioUrl: string | null | undefined,
  websiteUrl: string | null | undefined
): ProfileLink[] {
  if (Array.isArray(links) && links.length > 0) {
    return (links as ProfileLink[]).map((l) => ({
      ...l,
      id: l.id && String(l.id).length >= 8 ? String(l.id) : generateId(),
    })).filter((l) => l?.url?.trim());
  }

  const migrated: ProfileLink[] = [];
  if (portfolioUrl?.trim()) {
    migrated.push({ id: generateId(), label: 'Portfolio', url: portfolioUrl.trim() });
  }
  if (websiteUrl?.trim()) {
    migrated.push({ id: generateId(), label: 'Website', url: websiteUrl.trim() });
  }
  return migrated;
}

export function normalizeExtractedCV(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const experience = ((raw.experience as ExperienceEntry[]) ?? []).map((e) =>
    id({
      ...e,
      bullets: Array.isArray(e.bullets) ? e.bullets.slice(0, 8) : [],
    })
  );
  const education = ((raw.education as EducationEntry[]) ?? []).map(id);
  const skills = ((raw.skills as SkillCategory[]) ?? []).map(id);

  const projects = ((raw.projects as ProjectEntry[]) ?? []).map((p) =>
    id({
      ...p,
      links: normalizeEntryLinks(p.links, p.url, 'Link'),
    })
  );

  const certifications = ((raw.certifications as CertificationEntry[]) ?? []).map((c) =>
    id({
      ...c,
      links: normalizeEntryLinks(c.links, c.url, 'Credential'),
    })
  );

  const languages = ((raw.languages as LanguageEntry[]) ?? []).map(id);
  const awards = ((raw.awards as AwardEntry[]) ?? []).map(id);

  const links = normalizeProfileLinks(
    raw.links,
    raw.portfolio_url as string | null | undefined,
    raw.website_url as string | null | undefined
  );

  return {
    ...raw,
    experience,
    education,
    skills,
    projects,
    certifications,
    languages,
    awards,
    links,
  };
}
