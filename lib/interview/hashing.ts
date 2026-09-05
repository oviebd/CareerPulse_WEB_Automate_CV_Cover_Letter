import { createHash } from 'crypto';

export function hashJobContext(input: {
  jobTitle: string;
  companyName: string;
  jobSummary: string | null;
  keywords: string[];
  extraContext?: string | null;
}): string {
  const payload = JSON.stringify({
    t: input.jobTitle,
    c: input.companyName,
    s: input.jobSummary ?? '',
    k: input.keywords.slice().sort(),
    e: input.extraContext ?? '',
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function hashCvContext(cvRow: Record<string, unknown>): string {
  const summary = {
    title: cvRow.professional_title ?? cvRow.professionalTitle ?? '',
    summary: cvRow.summary ?? '',
    skills: cvRow.skills ?? [],
    experience: cvRow.experience ?? [],
    updated: cvRow.updated_at ?? cvRow.updatedAt ?? '',
  };
  return createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 16);
}
