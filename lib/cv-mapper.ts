import type { CVProfile, SkillGroup } from '@/types';

/**
 * Normalizes a `cvs` table row (Supabase JSONB) into the editor-facing CVProfile shape.
 */
export function dbRowToCvProfile(row: Record<string, unknown>): CVProfile {
  const links = Array.isArray(row.links) ? row.links : [];
  const skillsRaw = row.skills;
  const skills = Array.isArray(skillsRaw)
    ? (skillsRaw as SkillGroup[])
    : [];

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: typeof row.name === 'string' ? row.name : 'Untitled CV',
    full_name: (row.full_name as string | null) ?? null,
    professional_title: (row.professional_title as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    linkedin_url: (row.linkedin_url as string | null) ?? null,
    github_url: (row.github_url as string | null) ?? null,
    links: links as CVProfile['links'],
    portfolio_url: (row.portfolio_url as string | null) ?? undefined,
    website_url: (row.website_url as string | null) ?? undefined,
    address: (row.address as string | null) ?? undefined,
    photo_url: (row.photo_url as string | null) ?? undefined,
    summary: (row.summary as string | null) ?? null,
    experience: (Array.isArray(row.experience) ? row.experience : []) as CVProfile['experience'],
    education: (Array.isArray(row.education) ? row.education : []) as CVProfile['education'],
    skills,
    projects: (Array.isArray(row.projects) ? row.projects : []) as CVProfile['projects'],
    certifications: (Array.isArray(row.certifications)
      ? row.certifications
      : []) as CVProfile['certifications'],
    languages: (Array.isArray(row.languages) ? row.languages : []) as CVProfile['languages'],
    awards: (Array.isArray(row.awards) ? row.awards : []) as CVProfile['awards'],
    referrals: (Array.isArray(row.referrals) ? row.referrals : []) as CVProfile['referrals'],
    section_visibility:
      row.section_visibility && typeof row.section_visibility === 'object'
        ? (row.section_visibility as CVProfile['section_visibility'])
        : {},
    is_complete: Boolean(row.is_complete),
    completion_percentage: Number(row.completion_percentage ?? 0),
    original_cv_file_url: (row.original_cv_file_url as string | null) ?? null,
    preferred_template_id: String(
      row.preferred_template_id ?? row.preferred_cv_template_id ?? 'classic'
    ),
    font_family: (row.font_family as string | undefined) ?? 'Inter',
    accent_color: (row.accent_color as string | undefined) ?? '#6C63FF',
    job_ids: Array.isArray(row.job_ids) ? (row.job_ids as string[]) : [],
    ai_changes_summary: (row.ai_changes_summary as string | null) ?? null,
    keywords_added: Array.isArray(row.keywords_added)
      ? (row.keywords_added as string[])
      : [],
    bullets_improved: Number(row.bullets_improved ?? 0),
    is_archived: Boolean(row.is_archived),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
