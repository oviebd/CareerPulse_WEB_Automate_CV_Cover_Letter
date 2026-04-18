import type { CVData, CVSectionVisibilityKey } from '@/types';

function nz(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** True when this section has enough content to meaningfully appear on a CV. */
export function cvSectionHasFilledContent(key: CVSectionVisibilityKey, cv: CVData): boolean {
  switch (key) {
    case 'photo':
      return nz(cv.personal?.photo).length > 0;
    case 'address':
      return nz(cv.postalAddress).length > 0;
    case 'summary':
      return nz(cv.summary).length > 0;
    case 'experience':
      return (cv.experience ?? []).some(
        (ex) =>
          nz(ex.company).length > 0 ||
          nz(ex.role).length > 0 ||
          (ex.bullets ?? []).some((b) => nz(b).length > 0) ||
          nz(ex.highlights).length > 0
      );
    case 'education':
      return (cv.education ?? []).some(
        (e) =>
          nz(e.institution).length > 0 ||
          nz(e.degree).length > 0 ||
          nz(e.field).length > 0
      );
    case 'skills': {
      const groups = cv.skills ?? [];
      return groups.some(
        (g) =>
          nz(g.category).length > 0 ||
          (g.items ?? []).some((it) => nz(it.name).length > 0)
      );
    }
    case 'projects':
      return (cv.projects ?? []).some(
        (p) =>
          nz(p.name).length > 0 ||
          nz(p.description).length > 0 ||
          (p.bullets ?? []).some((b) => nz(b).length > 0) ||
          (p.technologies ?? []).some((t) => nz(t).length > 0)
      );
    case 'publications':
      return (cv.publications ?? []).some(
        (p) =>
          nz(p.title).length > 0 ||
          nz(p.journal).length > 0 ||
          nz(p.year).length > 0 ||
          (p.authors ?? []).some((a) => nz(a).length > 0)
      );
    case 'research':
      return (cv.research ?? []).some(
        (r) =>
          nz(r.title).length > 0 ||
          nz(r.description).length > 0 ||
          nz(r.institution).length > 0 ||
          nz(r.role).length > 0
      );
    case 'languages':
      return (cv.languages ?? []).some((l) => nz(l.name).length > 0);
    case 'certifications':
      return (cv.certifications ?? []).some((c) => nz(c.name).length > 0 || nz(c.issuer ?? '').length > 0);
    case 'referrals':
      return (cv.references ?? []).some(
        (r) =>
          nz(r.name).length > 0 ||
          nz(r.company ?? '').length > 0 ||
          nz(r.email ?? '').length > 0 ||
          nz(r.phone ?? '').length > 0
      );
    case 'awards':
      return (cv.awards ?? []).some((a) => nz(a.title).length > 0 || nz(a.issuer ?? '').length > 0);
    case 'volunteer':
      return (cv.volunteer ?? []).some(
        (v) => nz(v.organization).length > 0 || nz(v.role).length > 0 || nz(v.description).length > 0
      );
    case 'interests':
      return (cv.interests ?? []).some((line) => nz(line).length > 0);
    case 'custom':
      return (cv.custom ?? []).some(
        (cs) =>
          nz(cs.title).length > 0 ||
          (cs.items ?? []).some(
            (it) =>
              nz(it.heading).length > 0 ||
              nz(it.description ?? '').length > 0 ||
              (it.bullets ?? []).some((b) => nz(b).length > 0)
          )
      );
    default:
      return false;
  }
}
