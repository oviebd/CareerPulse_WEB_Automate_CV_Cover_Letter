import type { CVProfile } from '@/types';

/** Flat CV fields sent with POST /api/export so PDF works without a saved row id. */
export function cvProfileToExportSnapshot(
  d: CVProfile
): Record<string, unknown> {
  return {
    full_name: d.full_name,
    professional_title: d.professional_title,
    email: d.email,
    phone: d.phone,
    location: d.location,
    linkedin_url: d.linkedin_url,
    github_url: d.github_url,
    links: d.links ?? [],
    address: d.address ?? null,
    photo_url: d.photo_url ?? null,
    summary: d.summary,
    section_visibility: d.section_visibility ?? {},
    experience: d.experience ?? [],
    education: d.education ?? [],
    skills: d.skills ?? [],
    projects: d.projects ?? [],
    certifications: d.certifications ?? [],
    languages: d.languages ?? [],
    referrals: (d.referrals ?? []).slice(0, 2),
    awards: d.awards ?? [],
    cv_extra: d.cv_extra ?? {},
  };
}
