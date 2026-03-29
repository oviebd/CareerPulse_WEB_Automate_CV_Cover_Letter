import type {
  AwardEntry,
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  ProjectEntry,
  SkillGroup,
} from '@/types';
import { generateId } from '@/lib/utils';

function id<T extends { id?: string }>(row: T): T & { id: string } {
  return {
    ...row,
    id: row.id && String(row.id).length >= 8 ? String(row.id) : generateId(),
  };
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
  const skills = ((raw.skills as SkillGroup[]) ?? []).map(id);
  const projects = ((raw.projects as ProjectEntry[]) ?? []).map(id);
  const certifications = ((raw.certifications as CertificationEntry[]) ?? []).map(
    id
  );
  const languages = ((raw.languages as LanguageEntry[]) ?? []).map(id);
  const awards = ((raw.awards as AwardEntry[]) ?? []).map(id);

  return {
    ...raw,
    experience,
    education,
    skills,
    projects,
    certifications,
    languages,
    awards,
  };
}
