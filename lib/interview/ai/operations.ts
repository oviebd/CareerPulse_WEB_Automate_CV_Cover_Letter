import { runInterviewAi, INTERVIEW_ANALYZER_MODEL } from '@/lib/interview/ai/runner';
import {
  normalizeAnswerEvaluation,
  normalizeBlueprint,
  normalizeCandidateAnalysis,
  normalizeClarification,
  normalizeCompetencies,
  normalizeFinalReport,
  normalizeFollowUpDecision,
  normalizeGapAnalysis,
  normalizeInterviewQuestion,
  normalizeJobAnalysis,
  normalizePreparationPlan,
  normalizePrepQuestionBatch,
  normalizeQuizOutput,
} from '@/lib/interview/validators';

export const PROMPT_V = {
  JOB: 'interview_job_v1',
  CANDIDATE: 'interview_candidate_v1',
  COMPETENCY: 'interview_competency_v1',
  GAP: 'interview_gap_v1',
  BLUEPRINT: 'interview_blueprint_v1',
  CLARIFY: 'interview_clarify_v1',
  PREP: 'interview_prep_v1',
  PREP_QUESTIONS: 'interview_prep_questions_v1',
  QUIZ: 'interview_quiz_v1',
  QUIZ_EVAL: 'interview_quiz_eval_v1',
  QUESTION: 'interview_question_v1',
  EVAL: 'interview_eval_v1',
  FOLLOW_UP: 'interview_follow_up_v1',
  REPORT: 'interview_report_v1',
} as const;

const BASE_RULES = `You are an expert interview coach. Infer profession, role, seniority, and interview strategy dynamically from the job and candidate context.
Do NOT assume software engineering unless the job indicates it. Return ONLY valid JSON. No markdown.
Do not claim guaranteed interview questions or hiring probability. Frame as interview preparation only.`;

export function buildCvSummary(cv: Record<string, unknown>): string {
  const skills = Array.isArray(cv.skills)
    ? (cv.skills as Record<string, unknown>[])
        .flatMap((s) => {
          const items = s.items ?? s.skills;
          if (Array.isArray(items)) {
            return items.map((it) =>
              typeof it === 'string' ? it : (it as { name?: string }).name ?? ''
            );
          }
          return [];
        })
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const exp = Array.isArray(cv.experience)
    ? (cv.experience as Record<string, unknown>[])
        .slice(0, 5)
        .map(
          (e) =>
            `${e.title ?? ''} at ${e.company ?? ''} (${e.start_date ?? ''}-${e.is_current ? 'Present' : e.end_date ?? ''})`
        )
    : [];
  return JSON.stringify(
    {
      name: cv.full_name ?? cv.fullName,
      title: cv.professional_title ?? cv.professionalTitle,
      summary: cv.summary,
      skills,
      experience: exp,
      projects: Array.isArray(cv.projects)
        ? (cv.projects as Record<string, unknown>[]).slice(0, 3).map((p) => p.name)
        : [],
    },
    null,
    0
  );
}

/** Rich CV evidence for prep Q&A — roles, bullets, education, certs, etc. */
export function buildCvEvidenceContext(cv: Record<string, unknown>): string {
  const skills = Array.isArray(cv.skills)
    ? (cv.skills as Record<string, unknown>[])
        .flatMap((s) => {
          const items = s.items ?? s.skills;
          if (Array.isArray(items)) {
            return items.map((it) =>
              typeof it === 'string' ? it : (it as { name?: string }).name ?? ''
            );
          }
          return [];
        })
        .filter(Boolean)
    : [];

  const experience = Array.isArray(cv.experience)
    ? (cv.experience as Record<string, unknown>[]).map((e) => ({
        title: e.title ?? '',
        company: e.company ?? '',
        location: e.location ?? '',
        dates: `${e.start_date ?? ''} – ${e.is_current ? 'Present' : e.end_date ?? ''}`,
        bullets: Array.isArray(e.bullets)
          ? (e.bullets as string[]).filter(Boolean).slice(0, 6)
          : [],
        description: e.description ?? '',
      }))
    : [];

  const education = Array.isArray(cv.education)
    ? (cv.education as Record<string, unknown>[]).map((e) => ({
        institution: e.institution ?? '',
        degree: e.degree ?? '',
        field: e.field_of_study ?? e.field ?? '',
        dates: `${e.start_date ?? ''} – ${e.end_date ?? 'Present'}`,
      }))
    : [];

  const projects = Array.isArray(cv.projects)
    ? (cv.projects as Record<string, unknown>[]).slice(0, 5).map((p) => ({
        name: p.name ?? '',
        description: typeof p.description === 'string' ? p.description.slice(0, 300) : '',
        tech: Array.isArray(p.tech_stack) ? (p.tech_stack as string[]).slice(0, 8) : [],
      }))
    : [];

  const certifications = Array.isArray(cv.certifications)
    ? (cv.certifications as Record<string, unknown>[])
        .slice(0, 8)
        .map((c) => `${c.name ?? c.title ?? ''}${c.issuer ? ` (${c.issuer})` : ''}`)
        .filter(Boolean)
    : [];

  return JSON.stringify(
    {
      name: cv.full_name ?? cv.fullName,
      title: cv.professional_title ?? cv.professionalTitle,
      summary: cv.summary,
      skills,
      experience,
      education,
      projects,
      certifications,
    },
    null,
    0
  );
}

export function buildJobContext(job: {
  job_title: string;
  company_name: string;
  job_summary: string | null;
  keywords: string[];
  extra_context?: string | null;
}): string {
  return JSON.stringify(
    {
      title: job.job_title,
      company: job.company_name,
      summary: job.job_summary ?? '',
      keywords: job.keywords,
      extra: job.extra_context ?? '',
    },
    null,
    0
  );
}

export async function analyzeJobForInterview(
  jobCtx: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Analyze this job for interview preparation. Return JSON:
{"profession":"","occupation":"","role":"","domain":"","seniority":"","responsibilities":[],"required_competencies":[],"preferred_competencies":[],"experience_expectations":[],"likely_interview_methods":[],"evaluation_dimensions":[],"summary":""}

JOB CONTEXT:
${jobCtx}`,
    promptVersion: PROMPT_V.JOB,
    model: INTERVIEW_ANALYZER_MODEL,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeJobAnalysis,
  });
}

export async function analyzeCandidateForInterview(
  cvSummary: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Analyze this candidate for interview preparation. Return JSON:
{"skills":[],"experience_highlights":[],"achievements":[],"domain_experience":[],"potential_gaps":[],"summary":""}

CANDIDATE:
${cvSummary}`,
    promptVersion: PROMPT_V.CANDIDATE,
    model: INTERVIEW_ANALYZER_MODEL,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeCandidateAnalysis,
  });
}

export async function buildCompetencyModel(
  jobAnalysis: string,
  candidateAnalysis: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Build a competency model. Return at most 12 competencies. Keep each description under 120 characters. Return JSON: {"competencies":[{"id":"","name":"","category":"","description":"","importance":"high|medium|low|critical","priority":1,"evidence_from_job":"","evidence_from_candidate":"","candidate_mastery":0}]}

JOB ANALYSIS:
${jobAnalysis}

CANDIDATE ANALYSIS:
${candidateAnalysis}`,
    promptVersion: PROMPT_V.COMPETENCY,
    model: INTERVIEW_ANALYZER_MODEL,
    maxTokens: 8192,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: (raw) => normalizeCompetencies(raw.competencies),
  });
}

export async function performGapAnalysis(
  competencies: string,
  candidateAnalysis: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Perform gap analysis. Return JSON: {"gaps":[{"competency_id":"","competency_name":"","required_level":"","candidate_evidence":"","practice_score":null,"priority":"high|medium|low","rationale":""}]}

COMPETENCIES:
${competencies}

CANDIDATE:
${candidateAnalysis}`,
    promptVersion: PROMPT_V.GAP,
    model: INTERVIEW_ANALYZER_MODEL,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: (raw) => normalizeGapAnalysis(raw.gaps),
  });
}

export async function buildInterviewBlueprint(
  ctx: { job: string; candidate: string; competencies: string; gaps: string },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Build an interview blueprint. Keep arrays concise (max 8 items each). Return JSON with job_context, candidate_context, interview_strategy, preparation, quiz, mock_interview sections as described in the spec.

JOB: ${ctx.job}
CANDIDATE: ${ctx.candidate}
COMPETENCIES: ${ctx.competencies}
GAPS: ${ctx.gaps}`,
    promptVersion: PROMPT_V.BLUEPRINT,
    model: INTERVIEW_ANALYZER_MODEL,
    maxTokens: 8192,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeBlueprint,
  });
}

export async function checkClarificationNeeded(
  jobCtx: string,
  cvSummary: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Decide if clarification is needed before preparation. Only ask if materially missing. Max 4 questions. Return JSON:
{"needs_clarification":false,"questions":[{"id":"","question":"","reason":"","optional":true}]}

JOB: ${jobCtx}
CANDIDATE: ${cvSummary}`,
    promptVersion: PROMPT_V.CLARIFY,
    model: INTERVIEW_ANALYZER_MODEL,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeClarification,
  });
}

export async function generatePreparationTopics(
  mappedContext: string,
  competencyNames: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Generate interview preparation focus topics for this specific job and candidate.
Return JSON only:
{"title":"","topics":[{"name":"","priority":1,"competency_id":""}]}

Rules:
- Return 5 to 7 topic names (hard maximum 10).
- Topic names only — short labels (2-6 words), no day schedules, no activities, no descriptions.
- Topics must reflect what is most likely to be assessed in the interview for THIS role.
- Prioritize gaps and high-importance competencies.

MAPPED CONTEXT:
${mappedContext}

COMPETENCIES:
${competencyNames}`,
    promptVersion: PROMPT_V.PREP,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizePreparationPlan,
  });
}

/** @deprecated Use generatePreparationTopics */
export const generatePreparationPlan = generatePreparationTopics;

export async function generateQuiz(
  mappedContext: string,
  competencies: string,
  topicNames: string,
  difficulty: string,
  count: number,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Generate ${count} objective quiz questions for interview preparation. Return JSON only:
{"title":"","questions":[{"question":"","type":"","competency_id":"","difficulty":"","options":[],"correct_answer":"","explanation":""}]}

Rules:
- Allowed types only: single_choice, multiple_select, true_false, scenario
- single_choice: one correct option from options array
- multiple_select: correct_answer is array of option strings (2+ correct)
- true_false: correct_answer is true or false (boolean)
- scenario: workplace situation with decision options; correct_answer is one option string
- Every question MUST include correct_answer and explanation
- Do NOT use short_answer or open-ended questions

MAPPED CONTEXT: ${mappedContext}
TOPICS: ${topicNames}
COMPETENCIES: ${competencies}
DIFFICULTY: ${difficulty}`,
    promptVersion: PROMPT_V.QUIZ,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeQuizOutput,
  });
}

export async function generatePrepQuestionBatch(
  ctx: {
    mappedContext: string;
    seniority: string;
    interviewStage: string | null;
    existingQuestions: string[];
    count: number;
  },
  hashes: { job?: string; cv?: string }
) {
  const exclude =
    ctx.existingQuestions.length > 0
      ? `\nALREADY GENERATED (do NOT repeat or rephrase these):\n${ctx.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  return runInterviewAi({
    system: `${BASE_RULES}
For prep study Q&A: suggested answers must ONLY use facts from the mapped candidate context. Never invent employers, dates, metrics, tools, projects, or outcomes.
If the candidate has no relevant evidence for a question, set relevance to "irrelevant" and answer_text to a short honest message like "Irrelevant experience — no matching evidence in your CV for this question." Do NOT write a fabricated STAR story.`,
    user: `Generate exactly ${ctx.count} likely interview questions an interviewer might ask for THIS job, seniority, and stage.
Return JSON:
{"questions":[{"question":"","type":"","competency_id":"","difficulty":"","answer_text":"","relevance":"supported|irrelevant","evidence_from_cv":"","why_selected":""}]}

Rules:
- Questions must be realistic for the role and interview stage — not generic trivia.
- Prefer overlap between job requirements and candidate experience; include high-likelihood gap questions where evidence is weak.
- For relevance "supported": answer_text must cite only real facts from mapped context in evidence_from_cv.
- For relevance "irrelevant": answer_text must NOT fabricate experience.
- why_selected: one sentence on why this question is likely.
- Vary question types (behavioral, technical, situational, role-specific) as appropriate for the profession.
${exclude}

SENIORITY: ${ctx.seniority}
INTERVIEW STAGE: ${ctx.interviewStage ?? 'general'}
MAPPED CONTEXT:
${ctx.mappedContext}`,
    promptVersion: PROMPT_V.PREP_QUESTIONS,
    maxTokens: 4096,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizePrepQuestionBatch,
  });
}

export async function evaluateQuizAnswer(
  question: string,
  questionType: string,
  answer: string,
  rubric: string,
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Evaluate quiz answer. Return JSON:
{"overall_score":0,"dimension_scores":[],"strengths":[],"weaknesses":[],"missing_points":[],"feedback":"","follow_up_needed":false,"recommended_action":"next_competency"}

QUESTION (${questionType}): ${question}
RUBRIC: ${rubric}
ANSWER: ${answer}`,
    promptVersion: PROMPT_V.QUIZ_EVAL,
    maxTokens: 1024,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeAnswerEvaluation,
  });
}

export async function generateInterviewQuestion(
  ctx: {
    mappedContext: string;
    sessionSummary: string;
    competencyFocus?: string;
    remainingTopics?: string;
    difficulty?: string;
  },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Generate ONE realistic mock interview question. Return JSON:
{"question":"","type":"","competency_id":"","difficulty":"","expected_points":[],"evaluation_rubric":[]}

Rules:
- Cover important topics not yet explored before going deeper on one area.
- If SESSION shows a recent follow-up, prefer a new topic/competency.

MAPPED CONTEXT: ${ctx.mappedContext}
SESSION: ${ctx.sessionSummary}
REMAINING TOPICS: ${ctx.remainingTopics ?? 'cover all focus areas'}
FOCUS: ${ctx.competencyFocus ?? 'balanced coverage'}
DIFFICULTY: ${ctx.difficulty ?? 'medium'}`,
    promptVersion: PROMPT_V.QUESTION,
    maxTokens: 1024,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeInterviewQuestion,
  });
}

export async function evaluateInterviewAnswer(
  ctx: { question: string; rubric: string; answer: string; mode: string },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: `${BASE_RULES} Evaluate based ONLY on the candidate's answer. Be specific and evidence-based.`,
    user: `Evaluate interview answer. Return JSON:
{"overall_score":0,"dimension_scores":[{"name":"","score":0,"feedback":""}],"strengths":[],"weaknesses":[],"missing_points":[],"feedback":"","follow_up_needed":false,"recommended_action":"next_competency"}

QUESTION: ${ctx.question}
RUBRIC: ${ctx.rubric}
ANSWER: ${ctx.answer}
MODE: ${ctx.mode}`,
    promptVersion: PROMPT_V.EVAL,
    maxTokens: 1536,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeAnswerEvaluation,
  });
}

export async function decideFollowUp(
  ctx: {
    sessionSummary: string;
    lastEvaluation: string;
    questionCount: number;
    targetCount: number;
    remainingMinutes: number;
    followUpDepth: number;
    remainingTopics: string;
  },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Decide next mock interview action. Return JSON:
{"action":"follow_up|clarify|next_competency|revisit_weak|complete","rationale":"","next_competency_id":""}

Rules:
- Prefer breadth: cover remaining topics before deep follow-ups.
- Use follow_up ONLY if followUpDepth is 0 and the answer warrants one clarifying probe.
- If remainingMinutes <= 3 or questionCount >= targetCount, prefer complete.
- Do not chain multiple follow-ups on the same question thread.

SESSION: ${ctx.sessionSummary}
LAST EVAL: ${ctx.lastEvaluation}
PROGRESS: ${ctx.questionCount}/${ctx.targetCount}
REMAINING MINUTES: ${ctx.remainingMinutes}
FOLLOW-UP DEPTH: ${ctx.followUpDepth}
REMAINING TOPICS: ${ctx.remainingTopics}`,
    promptVersion: PROMPT_V.FOLLOW_UP,
    maxTokens: 512,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeFollowUpDecision,
  });
}

export async function generateFinalReport(
  ctx: { blueprint: string; sessionHistory: string; masterySummary: string },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Generate final interview report. readiness_score is 0-100 practice indicator, NOT hiring probability. Return JSON:
{"overall_score":0,"readiness_score":0,"dimensions":[],"strengths":[],"weaknesses":[],"missing_areas":[],"question_review":[],"recommendations":[],"improvement_trend":""}

BLUEPRINT: ${ctx.blueprint}
SESSION: ${ctx.sessionHistory}
MASTERY: ${ctx.masterySummary}`,
    promptVersion: PROMPT_V.REPORT,
    maxTokens: 4096,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeFinalReport,
  });
}
