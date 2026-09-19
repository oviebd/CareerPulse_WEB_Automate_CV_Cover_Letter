import type { ProfileLink } from '@/types';
import type { CVData, PersonalInfo } from '@/src/types/cv.types';

/** Named keys on `personal.links` (excluding linkedin / github). */
export type NamedPersonalLinkKey =
  | 'portfolio'
  | 'behance'
  | 'dribbble'
  | 'website'
  | 'orcid'
  | 'googleScholar'
  | 'researchGate';

export type OtherPersonalLink = {
  id?: string;
  label: string;
  url: string;
};

const NAMED_LABELS: Record<NamedPersonalLinkKey, string> = {
  portfolio: 'Portfolio',
  behance: 'Behance',
  dribbble: 'Dribbble',
  website: 'Website',
  orcid: 'ORCID',
  googleScholar: 'Google Scholar',
  researchGate: 'ResearchGate',
};

/** Map a user-facing label to a fixed personal.links key, if recognized. */
export function labelToNamedPersonalLinkKey(label: string): NamedPersonalLinkKey | null {
  const lower = label.trim().toLowerCase();
  if (!lower) return null;
  if (lower.includes('linkedin')) return null;
  if (lower.includes('github')) return null;
  if (lower.includes('portfolio') || lower === 'portfolio') return 'portfolio';
  if (lower.includes('behance')) return 'behance';
  if (lower.includes('dribbble')) return 'dribbble';
  if (lower.includes('website') || lower.includes('blog') || lower === 'site') return 'website';
  if (lower.includes('orcid')) return 'orcid';
  if (lower.includes('scholar')) return 'googleScholar';
  if (lower.includes('researchgate') || lower === 'rg') return 'researchGate';
  return null;
}

export function isDedicatedProfileLinkLabel(label: string): boolean {
  const lower = label.trim().toLowerCase();
  if (!lower) return false;
  return lower.includes('linkedin') || lower.includes('github');
}

export function extractNamedLinksFromProfileLinks(
  links: ProfileLink[]
): Partial<Record<NamedPersonalLinkKey, string | undefined>> {
  const out: Partial<Record<NamedPersonalLinkKey, string>> = {};
  for (const l of links) {
    const key = labelToNamedPersonalLinkKey(l.label);
    const url = l.url?.trim();
    if (key && url) out[key] = url;
  }
  return out;
}

export function legacyNamedLinksToFormLinks(pLinks: PersonalInfo['links']): ProfileLink[] {
  const links: ProfileLink[] = [];
  let n = 0;
  const add = (label: string, url: string | undefined) => {
    const u = (url ?? '').trim();
    if (!u) return;
    links.push({ id: `l-${n++}`, label, url: u });
  };
  add(NAMED_LABELS.portfolio, pLinks.portfolio);
  add(NAMED_LABELS.behance, pLinks.behance);
  add(NAMED_LABELS.dribbble, pLinks.dribbble);
  add(NAMED_LABELS.website, pLinks.website);
  add(NAMED_LABELS.orcid, pLinks.orcid);
  add(NAMED_LABELS.googleScholar, pLinks.googleScholar);
  add(NAMED_LABELS.researchGate, pLinks.researchGate);
  return links;
}

export function formLinksToPersonalOther(links: ProfileLink[]): OtherPersonalLink[] {
  return links.map((l) => ({ id: l.id, label: l.label, url: l.url }));
}

export function personalOtherToFormLinks(other: OtherPersonalLink[] | undefined): ProfileLink[] {
  return (other ?? []).map((l, i) => ({
    id: l.id && String(l.id).length >= 1 ? String(l.id) : `l-${i}`,
    label: l.label ?? '',
    url: l.url ?? '',
  }));
}

/** True when CV was edited with the extra-links list (including in-progress empty rows). */
export function hasStoredOtherProfileLinks(pLinks: PersonalInfo['links']): boolean {
  return Array.isArray(pLinks.other);
}

/** Re-attach in-progress link rows after save if the server payload omitted them. */
export function mergePreservedProfileLinkDrafts(local: CVData, fromServer: CVData): CVData {
  const localOther = local.personal?.links?.other;
  if (!Array.isArray(localOther)) return fromServer;

  const draftRows = localOther.filter((l) => !(l.url ?? '').trim());
  if (draftRows.length === 0) return fromServer;

  const serverOther = fromServer.personal.links.other ?? [];
  const mergedOther = [...serverOther];
  for (const draft of draftRows) {
    const id = draft.id ? String(draft.id) : '';
    if (id && mergedOther.some((m) => m.id === id)) continue;
    mergedOther.push(draft);
  }

  return {
    ...fromServer,
    personal: {
      ...fromServer.personal,
      links: {
        ...fromServer.personal.links,
        other: mergedOther,
      },
    },
  };
}
