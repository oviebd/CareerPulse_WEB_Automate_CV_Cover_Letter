import type {
  CandidateInterviewAnalysis,
  CompetencyItem,
  GapItem,
  JobInterviewAnalysis,
  MappedInterviewContext,
} from '@/types/interview';

export function buildMappedContext(input: {
  jobAnalysis: JobInterviewAnalysis;
  candidateAnalysis: CandidateInterviewAnalysis;
  competencies: CompetencyItem[];
  gaps: GapItem[];
  topicNames?: string[];
}): MappedInterviewContext {
  const topComps = [...input.competencies]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8)
    .map((c) => ({ id: c.id, name: c.name, importance: c.importance }));

  const brief = [
    `${input.jobAnalysis.role || input.jobAnalysis.occupation} at ${input.jobAnalysis.domain}.`,
    `Seniority: ${input.jobAnalysis.seniority}.`,
    input.jobAnalysis.summary,
    `Candidate: ${input.candidateAnalysis.summary}`,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 600);

  return {
    brief,
    role: input.jobAnalysis.role,
    seniority: input.jobAnalysis.seniority,
    profession: input.jobAnalysis.profession,
    job_must_haves: input.jobAnalysis.required_competencies.slice(0, 10),
    job_responsibilities: input.jobAnalysis.responsibilities.slice(0, 8),
    candidate_strengths: [
      ...input.candidateAnalysis.skills.slice(0, 12),
      ...input.candidateAnalysis.achievements.slice(0, 5),
    ],
    candidate_experience: input.candidateAnalysis.experience_highlights.slice(0, 8),
    candidate_gaps: input.candidateAnalysis.potential_gaps.slice(0, 6),
    competency_focus: topComps,
    topic_names: input.topicNames ?? [],
    generated_at: new Date().toISOString(),
  };
}

export function mappedContextPrompt(ctx: MappedInterviewContext): string {
  return JSON.stringify(
    {
      brief: ctx.brief,
      role: ctx.role,
      seniority: ctx.seniority,
      must_haves: ctx.job_must_haves,
      responsibilities: ctx.job_responsibilities,
      candidate_strengths: ctx.candidate_strengths,
      candidate_experience: ctx.candidate_experience,
      gaps: ctx.candidate_gaps,
      competencies: ctx.competency_focus,
      topics: ctx.topic_names,
    },
    null,
    0
  );
}

export function compactCompetencyList(
  rows: Array<{ id?: string; name?: string; importance?: string; metadata_json?: unknown }>
): string {
  return JSON.stringify(
    rows.map((c) => ({
      id: (c.metadata_json as { ai_id?: string })?.ai_id ?? c.id,
      name: c.name,
      importance: c.importance,
    })),
    null,
    0
  );
}

export function updateMappedContextTopics(
  ctx: MappedInterviewContext,
  topicNames: string[]
): MappedInterviewContext {
  return { ...ctx, topic_names: topicNames, generated_at: new Date().toISOString() };
}

export function rebuildMappedContextFromProfile(profile: Record<string, unknown>): MappedInterviewContext | null {
  const jobAnalysis = profile.job_analysis_json as JobInterviewAnalysis | null;
  const candidateAnalysis = profile.candidate_analysis_json as CandidateInterviewAnalysis | null;
  if (!jobAnalysis || !candidateAnalysis) return null;
  const gaps = Array.isArray(profile.gap_json) ? (profile.gap_json as GapItem[]) : [];
  return buildMappedContext({
    jobAnalysis,
    candidateAnalysis,
    competencies: [],
    gaps,
    topicNames: [],
  });
}
