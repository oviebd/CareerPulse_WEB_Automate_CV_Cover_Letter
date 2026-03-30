import type { CVData } from '@/types';

/** Concatenate CV fields into one searchable string (case handled by caller). */
export function flattenCvSearchText(cv: CVData): string {
  const parts: string[] = [];
  parts.push(
    cv.full_name ?? '',
    cv.professional_title ?? '',
    cv.summary ?? '',
    cv.address ?? ''
  );
  for (const ex of cv.experience ?? []) {
    parts.push(
      ex.title,
      ex.company,
      ex.location ?? '',
      ex.description ?? '',
      ...(ex.bullets ?? [])
    );
  }
  for (const ed of cv.education ?? []) {
    parts.push(
      ed.institution,
      ed.degree ?? '',
      ed.field_of_study ?? '',
      ed.description ?? '',
      ed.gpa ?? ''
    );
  }
  for (const g of cv.skills ?? []) {
    parts.push(...(g.items ?? []));
  }
  for (const p of cv.projects ?? []) {
    parts.push(p.name, p.description ?? '', ...(p.tech_stack ?? []));
  }
  for (const c of cv.certifications ?? []) {
    parts.push(c.name, c.issuer ?? '');
  }
  for (const l of cv.languages ?? []) {
    parts.push(l.language);
  }
  for (const a of cv.awards ?? []) {
    parts.push(a.title, a.description ?? '', a.issuer ?? '');
  }
  for (const r of cv.referrals ?? []) {
    parts.push(r.name, r.title ?? '', r.company ?? '', r.relationship ?? '');
  }
  return parts.join(' ');
}

/** True if keyword appears as a substring of CV text (case-insensitive). */
export function isKeywordPresentInCv(keyword: string, cv: CVData): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return false;
  const hay = flattenCvSearchText(cv).toLowerCase();
  return hay.includes(needle);
}
