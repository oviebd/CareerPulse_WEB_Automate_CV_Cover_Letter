import type {
  AwardEntry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SkillGroup,
} from '@/types';

function nonEmpty(s: string | null | undefined): boolean {
  return Boolean(s && String(s).trim().length > 0);
}

export function computeCompletionPercentage(input: {
  full_name?: string | null;
  professional_title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: SkillGroup[];
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  languages?: LanguageEntry[];
  awards?: AwardEntry[];
}): { percentage: number; isComplete: boolean } {
  const weights: { key: string; weight: number; ok: boolean }[] = [
    {
      key: 'name',
      weight: 8,
      ok: nonEmpty(input.full_name),
    },
    {
      key: 'title',
      weight: 6,
      ok: nonEmpty(input.professional_title),
    },
    { key: 'email', weight: 6, ok: nonEmpty(input.email) },
    { key: 'phone', weight: 4, ok: nonEmpty(input.phone) },
    { key: 'location', weight: 4, ok: nonEmpty(input.location) },
    { key: 'summary', weight: 10, ok: nonEmpty(input.summary) },
    {
      key: 'experience',
      weight: 22,
      ok: (input.experience?.length ?? 0) > 0,
    },
    {
      key: 'education',
      weight: 12,
      ok: (input.education?.length ?? 0) > 0,
    },
    {
      key: 'skills',
      weight: 12,
      ok: (input.skills?.some((g) => g.items.length > 0) ?? false),
    },
    {
      key: 'projects',
      weight: 6,
      ok: (input.projects?.length ?? 0) > 0,
    },
    {
      key: 'certs',
      weight: 4,
      ok: (input.certifications?.length ?? 0) > 0,
    },
    {
      key: 'languages',
      weight: 4,
      ok: (input.languages?.length ?? 0) > 0,
    },
    {
      key: 'awards',
      weight: 2,
      ok: (input.awards?.length ?? 0) > 0,
    },
  ];
  const total = weights.reduce((s, w) => s + w.weight, 0);
  const earned = weights.filter((w) => w.ok).reduce((s, w) => s + w.weight, 0);
  const percentage = Math.round((earned / total) * 100);
  const isComplete = percentage >= 85;
  return { percentage, isComplete };
}
