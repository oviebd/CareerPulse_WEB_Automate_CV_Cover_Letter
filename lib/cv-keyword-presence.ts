import type { CVData } from '@/types';

function skillName(it: { name: string } | string): string {
  return typeof it === 'string' ? it : it.name;
}

/** Concatenate CV fields into one searchable string (case handled by caller). */
export function flattenCvSearchText(cv: CVData): string {
  const p = cv.personal;
  const parts: string[] = [];
  parts.push(
    p?.fullName ?? '',
    p?.title ?? '',
    cv.summary ?? '',
    cv.postalAddress ?? ''
  );
  for (const ex of cv.experience ?? []) {
    parts.push(
      ex.role,
      ex.company,
      ex.location ?? '',
      ex.highlights ?? '',
      ...(ex.bullets ?? [])
    );
  }
  for (const ed of cv.education ?? []) {
    parts.push(
      ed.institution,
      ed.degree ?? '',
      ed.field ?? '',
      ed.thesis ?? '',
      ed.gpa ?? ''
    );
  }
  for (const g of cv.skills ?? []) {
    parts.push(...(g.items ?? []).map(skillName));
  }
  for (const proj of cv.projects ?? []) {
    parts.push(proj.name, proj.description ?? '', ...(proj.technologies ?? []));
  }
  for (const c of cv.certifications ?? []) {
    parts.push(c.name, c.issuer ?? '');
  }
  for (const l of cv.languages ?? []) {
    parts.push(l.name);
  }
  for (const a of cv.awards ?? []) {
    parts.push(a.title, a.description ?? '', a.issuer ?? '');
  }
  for (const r of cv.references ?? []) {
    parts.push(r.name, r.role ?? '', r.company ?? '', r.relationship ?? '');
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
