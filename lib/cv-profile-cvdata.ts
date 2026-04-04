import type { CVData, CVProfile } from '@/types';

export function cvProfileToCvData(p: CVProfile): CVData {
  return {
    full_name: p.full_name,
    professional_title: p.professional_title,
    email: p.email,
    phone: p.phone,
    location: p.location,
    linkedin_url: p.linkedin_url,
    github_url: p.github_url,
    links: p.links ?? [],
    portfolio_url: p.portfolio_url,
    website_url: p.website_url,
    section_visibility: p.section_visibility ?? {},
    address: p.address ?? null,
    photo_url: p.photo_url ?? null,
    summary: p.summary,
    experience: p.experience ?? [],
    education: p.education ?? [],
    skills: p.skills ?? [],
    projects: p.projects ?? [],
    certifications: p.certifications ?? [],
    languages: p.languages ?? [],
    awards: p.awards ?? [],
    referrals: p.referrals ?? [],
    accent_color: p.accent_color,
    font_family: p.font_family,
  };
}
