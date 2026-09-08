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
  normalizeInterviewTurn,
  normalizeJobAnalysis,
  normalizePreparationPlan,
  normalizePrepQuestionBatch,
  normalizeQuizOutput,
  normalizeExampleAnswer,
  normalizeExplanation,
  normalizeReshapedAnswer,
} from '@/lib/interview/validators';

export const PROMPT_V = {
  JOB: 'interview_job_v1',
  CANDIDATE: 'interview_candidate_v1',
  COMPETENCY: 'interview_competency_v1',
  GAP: 'interview_gap_v1',
  BLUEPRINT: 'interview_blueprint_v1',
  CLARIFY: 'interview_clarify_v1',
  PREP: 'interview_prep_v1',
  PREP_QUESTIONS: 'interview_prep_questions_v5',
  PREP_QUESTION_EXPLAIN: 'interview_prep_question_explain_v2',
  PREP_QUESTION_EXAMPLE: 'interview_prep_question_example_v1',
  PREP_QUESTION_RESHAPE: 'interview_prep_question_reshape_v1',
  QUIZ: 'interview_quiz_v2',
  QUIZ_EVAL: 'interview_quiz_eval_v1',
  QUESTION: 'interview_question_v1',
  EVAL: 'interview_eval_v1',
  FOLLOW_UP: 'interview_follow_up_v1',
  TURN: 'interview_turn_v1',
  REPORT: 'interview_report_v1',
  REPORT_V2: 'interview_report_v2',
} as const;

const BASE_RULES = `You are an expert interview coach. Infer profession, role, seniority, and interview strategy dynamically from the job and candidate context.
Do NOT assume software engineering unless the job indicates it. Return ONLY valid JSON. No markdown fences around the JSON itself.
Do not claim guaranteed interview questions or hiring probability. Frame as interview preparation only.`;

const PREP_MARKDOWN_RULE = `Format answer_text, evidence_from_cv, and explanation fields as Markdown (not HTML): start with a brief opening line, then use 3–6 bullet points (- item) when helpful, **bold** for emphasis, inline \`code\`, and a brief fenced \`\`\`language block only if the question requires it. Do not write guidelines, headings, or study tips in answer_text.`;

const PREP_ANSWER_LENGTH_RULE = `Aim for 800–1000 characters. Never exceed 1500 characters.`;

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
  hashes: { job?: string; cv?: string },
  focusTopic?: string | null
) {
  const scopeRule = focusTopic
    ? `- ALL questions must be about this topic only: ${focusTopic}. Title must mention this topic.`
    : `- Cover a mix of these topics: ${topicNames}. Title should indicate an all-topics quiz.`;

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
${scopeRule}

MAPPED CONTEXT: ${mappedContext}
TOPICS: ${focusTopic || topicNames}
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
    topicNames: string[];
    focusTopic?: string | null;
  },
  hashes: { job?: string; cv?: string }
) {
  const exclude =
    ctx.existingQuestions.length > 0
      ? `\nALREADY GENERATED (do NOT repeat or rephrase these):\n${ctx.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const topicList = ctx.topicNames.join(', ');
  const scopeRule = ctx.focusTopic
    ? `- ALL questions must be about this topic only: ${ctx.focusTopic}. Set topic_name to exactly "${ctx.focusTopic}".`
    : `- Cover these topics: ${topicList}. Each question MUST include topic_name matching one of those labels.`;

  return runInterviewAi({
    system: `${BASE_RULES}
For prep study Q&A: answers must ONLY use facts from the mapped candidate context. Never invent employers, dates, metrics, tools, projects, or outcomes.
If the candidate has no relevant evidence for a question, set relevance to "irrelevant" and answer_text to a short honest message like "Irrelevant experience — no matching evidence in your CV for this question." Do NOT write a fabricated STAR story.`,
    user: `Generate exactly ${ctx.count} likely interview questions an interviewer might ask for THIS job, seniority, and stage.
Return JSON:
{"questions":[{"question":"","type":"","competency_id":"","difficulty":"","answer_text":"","relevance":"supported|irrelevant","evidence_from_cv":"","why_selected":"","topic_name":""}]}

Rules:
- Questions must be realistic for the role and interview stage — not generic trivia.
- Prefer overlap between job requirements and candidate experience; include high-likelihood gap questions where evidence is weak.
- answer_text is the ANSWER the candidate can use — a complete first-person response using ONLY real facts from mapped context.
- Do NOT write a coaching guideline, structure tips, or "how to answer" notes. No separate sample.
- ${PREP_ANSWER_LENGTH_RULE}
- ${PREP_MARKDOWN_RULE}
- For relevance "supported": evidence_from_cv must cite only real facts from mapped context.
- For relevance "irrelevant": answer_text must NOT fabricate experience.
- why_selected: one sentence on why this question is likely.
- Vary question types (behavioral, technical, situational, role-specific) as appropriate for the profession.
${scopeRule}
${exclude}

SENIORITY: ${ctx.seniority}
INTERVIEW STAGE: ${ctx.interviewStage ?? 'general'}
FOCUS TOPIC: ${ctx.focusTopic ?? 'any of the listed topics'}
AVAILABLE TOPICS: ${topicList}
MAPPED CONTEXT:
${ctx.mappedContext}`,
    promptVersion: PROMPT_V.PREP_QUESTIONS,
    maxTokens: 8192,
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

const INTERVIEWER_VOICE = `${BASE_RULES}
You are a senior, experienced interviewer conducting a mock interview. Speak naturally and conversationally in feedback (max 2 sentences, ~40 words). Transition smoothly to the next question when moving on.`;

export async function evaluateAndContinueInterview(
  ctx: {
    question: string;
    rubric: string;
    answer: string;
    mode: string;
    difficulty?: string;
    mappedContext: string;
    focusHint: 'follow_up' | 'next_competency';
    competencyFocus?: string;
    questionCount: number;
    targetCount: number;
    remainingMinutes: number;
    evaluationOnly: boolean;
  },
  hashes: { job?: string; cv?: string }
) {
  const nextQuestionSchema = ctx.evaluationOnly
    ? 'Set next_question to null.'
    : `Include next_question with question, type, competency_id, difficulty, expected_points (max 3), evaluation_rubric (max 3).
If focusHint is follow_up, probe the last answer naturally. Otherwise transition to competencyFocus with a fresh question.`;

  return runInterviewAi({
    system: INTERVIEWER_VOICE,
    user: `Evaluate the candidate's answer and ${ctx.evaluationOnly ? 'wrap up the interview' : 'generate your next question'}. Return JSON:
{"overall_score":0,"dimension_scores":[{"name":"","score":0,"feedback":""}],"strengths":[],"weaknesses":[],"missing_points":[],"feedback":"","action":"follow_up|next_competency|complete","next_question":null}

Rules:
- feedback: natural spoken interviewer note (max 2 sentences, ~40 words). No bullet lists.
- dimension_scores: max 3 items. strengths/weaknesses: max 2 each. missing_points: max 3.
- action: follow_up only if focusHint is follow_up and answer warrants a probe; otherwise next_competency or complete.
- ${nextQuestionSchema}

QUESTION: ${ctx.question}
RUBRIC: ${ctx.rubric}
ANSWER: ${ctx.answer}
MODE: ${ctx.mode}
DIFFICULTY: ${ctx.difficulty ?? 'medium'}
MAPPED CONTEXT: ${ctx.mappedContext}
FOCUS HINT: ${ctx.focusHint}
COMPETENCY FOCUS: ${ctx.competencyFocus ?? 'balanced'}
PROGRESS: ${ctx.questionCount}/${ctx.targetCount}
REMAINING MINUTES: ${ctx.remainingMinutes}`,
    promptVersion: PROMPT_V.TURN,
    maxTokens: 1200,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeInterviewTurn,
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

export async function generateFinalReportFromEvaluations(
  ctx: { blueprintSummary: string; evaluationDigest: string; masterySummary: string },
  hashes: { job?: string; cv?: string }
) {
  return runInterviewAi({
    system: BASE_RULES,
    user: `Generate final interview report from per-question evaluations. readiness_score is 0-100 practice indicator, NOT hiring probability. Return JSON:
{"overall_score":0,"readiness_score":0,"dimensions":[],"strengths":[],"weaknesses":[],"missing_areas":[],"question_review":[],"recommendations":[],"improvement_trend":""}

Use EVALUATIONS for question_review (one entry per question). Do not invent scores — derive from provided data.

STRATEGY: ${ctx.blueprintSummary}
EVALUATIONS: ${ctx.evaluationDigest}
MASTERY: ${ctx.masterySummary}`,
    promptVersion: PROMPT_V.REPORT_V2,
    maxTokens: 1536,
    sourceJobHash: hashes.job,
    sourceCvHash: hashes.cv,
    normalize: normalizeFinalReport,
  });
}

export async function generatePrepQuestionExample(ctx: {
  question: string;
  answer: string;
  evidence?: string | null;
  relevance: string;
  mappedContext: string;
  isTopic: boolean;
}) {
  const grounding = ctx.isTopic
    ? 'Do NOT invent personal work history. Write a realistic sample at the target level using only the mapped topic context.'
    : 'Use ONLY facts from the mapped candidate context. Never invent employers, dates, metrics, tools, projects, or outcomes.';
  const irrelevantRule =
    ctx.relevance === 'irrelevant'
      ? 'Relevance is irrelevant: return a short honest note, not a fabricated sample.'
      : `Write a complete first-person answer. ${PREP_ANSWER_LENGTH_RULE}`;

  return runInterviewAi({
    system: `${BASE_RULES}
${grounding}`,
    user: `Write one example answer for this interview prep question.
Return JSON: {"example_answer":""}

${irrelevantRule}
Do not write a guideline. Use light Markdown only if needed.

QUESTION: ${ctx.question}
EXISTING ANSWER: ${ctx.answer}
EVIDENCE: ${ctx.evidence ?? ''}
MAPPED CONTEXT:
${ctx.mappedContext}`,
    promptVersion: PROMPT_V.PREP_QUESTION_EXAMPLE,
    maxTokens: 1024,
    normalize: normalizeExampleAnswer,
  });
}

export async function explainPrepQuestion(ctx: {
  question: string;
  answer: string;
  evidence?: string | null;
  mappedContext: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  message?: string;
}) {
  const historyBlock =
    ctx.history.length > 0
      ? `\nPRIOR TURNS:\n${ctx.history.map((t) => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}`
      : '';
  const userAsk = ctx.message?.trim()
    ? `\nUSER FOLLOW-UP: ${ctx.message.trim()}`
    : '\nNo follow-up yet. Explain the question itself.';

  return runInterviewAi({
    system: `${BASE_RULES}
You are coaching a candidate. Explain what the interviewer is probing and how to think about the answer.
Do not invent CV facts. Do not repeat the full answer verbatim. Keep explanations practical and concise.
${PREP_MARKDOWN_RULE}`,
    user: `Explain this interview prep question.
Return JSON: {"explanation":""}

QUESTION: ${ctx.question}
ANSWER: ${ctx.answer}
EVIDENCE: ${ctx.evidence ?? ''}
MAPPED CONTEXT:
${ctx.mappedContext}
${historyBlock}
${userAsk}`,
    promptVersion: PROMPT_V.PREP_QUESTION_EXPLAIN,
    maxTokens: 1024,
    normalize: normalizeExplanation,
  });
}

const RESHAPE_TONE_GUIDE: Record<string, string> = {
  professional: 'Polished, formal, and interview-ready. Clear structure without slang.',
  easy: 'Simple, accessible language. Explain clearly as if speaking to a non-expert.',
  confident: 'Assertive and ownership-focused. Strong verbs and decisive phrasing.',
  concise: 'Short and punchy. Cut filler; keep only the strongest points.',
};

export async function reshapePrepQuestion(ctx: {
  question: string;
  draft: string;
  tone: string;
  targetChars: number;
  mappedContext: string;
  isTopic: boolean;
  evidence?: string | null;
}) {
  const grounding = ctx.isTopic
    ? 'Do NOT invent personal work history. Reshape using only the user draft and mapped topic context.'
    : 'Use ONLY facts from the user draft and mapped candidate context. Never invent employers, dates, metrics, tools, projects, or outcomes.';
  const toneGuide = RESHAPE_TONE_GUIDE[ctx.tone] ?? RESHAPE_TONE_GUIDE.professional;

  return runInterviewAi({
    system: `${BASE_RULES}
${grounding}
You reshape a candidate's rough answer into a polished interview response.`,
    user: `Reshape the user's draft into a stronger interview answer.
Return JSON: {"answer_text":""}

Rules:
- Preserve the user's core facts and intent. Do not invent new experience.
- Tone: ${ctx.tone} — ${toneGuide}
- Target length: about ${ctx.targetChars} characters. Never exceed 1500 characters.
- ${PREP_MARKDOWN_RULE}
- Do NOT write coaching guidelines, structure tips, or "how to answer" notes.

QUESTION: ${ctx.question}
USER DRAFT: ${ctx.draft}
EVIDENCE: ${ctx.evidence ?? ''}
MAPPED CONTEXT:
${ctx.mappedContext}`,
    promptVersion: PROMPT_V.PREP_QUESTION_RESHAPE,
    maxTokens: 2048,
    normalize: normalizeReshapedAnswer,
  });
}
