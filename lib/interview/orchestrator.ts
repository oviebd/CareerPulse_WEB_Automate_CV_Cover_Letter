import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getJobsRepo } from '@/lib/db/repositories/jobs';
import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { InterviewError } from '@/lib/interview/errors';
import {
  analyzeCandidateForInterview,
  analyzeJobForInterview,
  buildCompetencyModel,
  buildInterviewBlueprint,
  buildCvSummary,
  buildJobContext,
  checkClarificationNeeded,
  decideFollowUp,
  evaluateInterviewAnswer,
  generateFinalReport,
  generateInterviewQuestion,
  generatePreparationTopics,
  generatePrepQuestionBatch,
  generatePrepQuestionExample,
  explainPrepQuestion,
  reshapePrepQuestion,
  generateQuiz,
  performGapAnalysis,
} from '@/lib/interview/ai/operations';
import { blueprintSummary, summarizeMasteryForAi, summarizeSessionForAi } from '@/lib/interview/context';
import {
  buildMappedContext,
  compactCompetencyList,
  mappedContextPrompt,
  rebuildMappedContextFromProfile,
  updateMappedContextTopics,
} from '@/lib/interview/mapped-context';
import { hashCvContext, hashJobContext } from '@/lib/interview/hashing';
import { updateMasteryScore } from '@/lib/interview/mastery';
import { calculateReadiness } from '@/lib/interview/readiness';
import { evaluateQuizAnswerLocal } from '@/lib/interview/quiz-eval';
import { normalizeBlueprint } from '@/lib/interview/validators';
import { parseTopicPrepConfig, enrichProfileDisplay, seedPreparationTopicsFromProfile, skillLevelToExpertise } from '@/lib/interview/topic-config';
import { generateTopicPrepQuestionBatch } from '@/lib/interview/ai/topic-operations';
import {
  buildJobSeedContext,
  competencyNamesForAi,
  competenciesFromSeedTopics,
  seedBlueprintFromTopics,
} from '@/lib/interview/seed-profile';
import { matchTopicId } from '@/lib/interview/topic-match';
import { displayPrepAnswer } from '@/lib/interview/prep-answer';
import { setAiUsageContext } from '@/lib/ai/usage-context';
import type { InterviewProfile } from '@/types/interview';
import type {
  ClarificationPayload,
  CompetencyItem,
  InterviewBlueprint,
  GapItem,
  MappedInterviewContext,
} from '@/types/interview';

const ANALYZING_STALE_MS = 5 * 60 * 1000;

function normalizedBlueprintFromProfile(profile: Record<string, unknown>): InterviewBlueprint {
  return normalizeBlueprint((profile.blueprint_json ?? {}) as Record<string, unknown>);
}

export async function recalculateProfileProgress(userId: string, profileId: string) {
  const repo = getInterviewRepo();
  const plan = await repo.getActivePlan(profileId);
  const topics = plan ? await repo.listTopics(plan.id as string) : [];
  const sessions = await repo.listSessions(profileId);
  const quizAttempts = await repo.listQuizAttemptsForProfile(userId, profileId);

  const readiness = calculateReadiness({
    topics,
    quizAttempts,
    sessions,
  });

  await repo.updateProfile(userId, profileId, {
    readiness_score: readiness.overall,
  });

  return readiness;
}

async function chainPrepareAfterAnalyze(userId: string, profileId: string) {
  try {
    const prepared = await runPreparePipeline(userId, profileId);
    return {
      plan: prepared.plan,
      topics: prepared.topics,
      prep_questions: prepared.prep_questions,
      plan_error: false as const,
    };
  } catch (e) {
    console.error('interview/prepare chain', e);
    return {
      plan: null,
      topics: [] as Record<string, unknown>[],
      prep_questions: [] as Record<string, unknown>[],
      plan_error: true as const,
    };
  }
}

async function ensureMappedContextForProfile(
  userId: string,
  profile: Record<string, unknown>
): Promise<MappedInterviewContext> {
  const existing = profile.mapped_context_json as MappedInterviewContext | null;
  if (existing?.brief) return existing;

  const rebuilt = rebuildMappedContextFromProfile(profile);
  if (rebuilt) {
    const repo = getInterviewRepo();
    const competencies = await repo.listCompetencies(profile.id as string);
    if (competencies.length > 0) {
      rebuilt.competency_focus = competencies.slice(0, 8).map((c) => ({
        id: ((c.metadata_json as { ai_id?: string })?.ai_id ?? c.id) as string,
        name: c.name as string,
        importance: (c.importance as string) ?? 'medium',
      }));
    }
    const plan = await repo.getActivePlan(profile.id as string);
    if (plan) {
      const topics = await repo.listTopics(plan.id as string);
      rebuilt.topic_names = topics.map((t) => t.name as string);
    }
    await repo.updateProfile(userId, profile.id as string, {
      mapped_context_json: rebuilt,
    });
    return rebuilt;
  }

  throw new Error('Mapped context unavailable — re-run analysis');
}

function followUpDepth(
  question: Record<string, unknown>,
  questions: Record<string, unknown>[]
): number {
  let depth = 0;
  let current = question;
  const byId = new Map(questions.map((q) => [q.id as string, q]));
  while (current.parent_question_id) {
    depth += 1;
    const parent = byId.get(current.parent_question_id as string);
    if (!parent) break;
    current = parent;
  }
  return depth;
}

function sessionElapsedMinutes(session: Record<string, unknown>): number {
  const started = session.started_at ?? session.created_at;
  if (!started) return 0;
  return (Date.now() - new Date(started as string).getTime()) / 60_000;
}

function sessionRemainingMinutes(session: Record<string, unknown>): number {
  const budget = (session.duration_minutes as number) ?? 25;
  return Math.max(0, budget - sessionElapsedMinutes(session));
}

type JobRow = {
  job_title: string;
  company_name: string;
  job_summary: string | null;
  keywords: string[];
  interview_at?: string | null;
};

async function resolveCv(userId: string, jobId: string, cvId?: string) {
  const cvs = getCvsRepo();
  if (cvId) {
    const row = await cvs.getById(userId, cvId);
    if (row) return row;
  }
  const all = await cvs.listByUser(userId);
  if (all.length === 0) return null;

  const linked = all.find((c) => {
    const ids = (c.job_ids as string[] | undefined) ?? [];
    return ids.includes(jobId);
  });
  if (linked) return linked;

  const general = all.find((c) => !((c.job_ids as string[] | undefined) ?? []).length);
  if (general) return general;

  return all[0];
}

export async function runAnalyzePipeline(
  userId: string,
  jobId: string,
  opts?: {
    cvId?: string;
    extraContext?: string;
    clarificationAnswers?: Record<string, string>;
    interviewDate?: string;
    interviewStage?: string;
  }
) {
  const jobs = getJobsRepo();
  const repo = getInterviewRepo();
  const job = (await jobs.getById(userId, jobId)) as JobRow | null;
  if (!job) throw new Error('Job not found');

  const cv = await resolveCv(userId, jobId, opts?.cvId);
  if (!cv) throw new Error('CV not found');

  const keywords = Array.isArray(job.keywords) ? (job.keywords as string[]) : [];
  const jobHash = hashJobContext({
    jobTitle: job.job_title,
    companyName: job.company_name,
    jobSummary: job.job_summary,
    keywords,
    extraContext: opts?.extraContext,
  });
  const cvHash = hashCvContext(cv);

  let profile = await repo.getProfileByJob(userId, jobId);
  if (profile?.status === 'analyzing') {
    const updated = new Date(profile.updated_at as string).getTime();
    if (Date.now() - updated < ANALYZING_STALE_MS) {
      return { profile, status: 'in_progress' as const };
    }
  }

  if (
    profile?.status === 'ready' &&
    profile.source_job_hash === jobHash &&
    profile.source_cv_hash === cvHash &&
    !opts?.clarificationAnswers
  ) {
    const existing = await repo.getActivePlan(profile.id as string);
    if (existing) {
      return {
        profile,
        status: 'reused' as const,
        plan: existing,
        topics: await repo.listTopics(existing.id as string),
      };
    }
    const chained = await chainPrepareAfterAnalyze(userId, profile.id as string);
    return { profile, status: 'reused' as const, ...chained };
  }

  if (!profile) {
    profile = await repo.insertProfile(userId, {
      job_id: jobId,
      cv_id: cv.id,
      status: 'analyzing',
      source_job_hash: jobHash,
      source_cv_hash: cvHash,
      extra_context: opts?.extraContext ?? null,
      interview_date: opts?.interviewDate ?? null,
      interview_stage: opts?.interviewStage ?? null,
    });
  } else {
    profile = await repo.updateProfile(userId, profile.id as string, {
      status: 'analyzing',
      cv_id: cv.id,
      source_job_hash: jobHash,
      source_cv_hash: cvHash,
      extra_context: opts?.extraContext ?? profile.extra_context,
      ...(opts?.interviewDate ? { interview_date: opts.interviewDate } : {}),
      ...(opts?.interviewStage ? { interview_stage: opts.interviewStage } : {}),
    });
  }

  const profileId = profile.id as string;
  let effectiveExtraContext =
    (opts?.extraContext ?? (profile.extra_context as string | null))?.trim() || null;
  const cvSummary = buildCvSummary(cv);
  const hashes = { job: jobHash, cv: cvHash };

  try {
    if (opts?.clarificationAnswers) {
      const extra = Object.entries(opts.clarificationAnswers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      effectiveExtraContext = `${effectiveExtraContext ?? ''}\n${extra}`.trim();
      const clarification = profile.clarification_json as ClarificationPayload | null;
      profile = await repo.updateProfile(userId, profileId, {
        extra_context: effectiveExtraContext,
        clarification_json: clarification
          ? { ...clarification, answers: opts.clarificationAnswers }
          : { needs_clarification: false, questions: [], answers: opts.clarificationAnswers },
      });
    }

    const jobCtx = buildJobContext({
      job_title: job.job_title,
      company_name: job.company_name,
      job_summary: job.job_summary,
      keywords,
      extra_context: effectiveExtraContext,
    });

    if (!opts?.clarificationAnswers) {
      const clarify = await checkClarificationNeeded(jobCtx, cvSummary, hashes);
      if (clarify.data.needs_clarification) {
        profile = await repo.updateProfile(userId, profileId, {
          status: 'needs_clarification',
          clarification_json: clarify.data,
        });
        return { profile, status: 'needs_clarification' as const, clarification: clarify.data };
      }
    }

    const [jobAnalysis, candidateAnalysis] = await Promise.all([
      analyzeJobForInterview(jobCtx, hashes),
      analyzeCandidateForInterview(cvSummary, hashes),
    ]);

    const competencies = await buildCompetencyModel(
      JSON.stringify(jobAnalysis.data),
      JSON.stringify(candidateAnalysis.data),
      hashes
    );
    const gaps = await performGapAnalysis(
      JSON.stringify(competencies.data),
      JSON.stringify(candidateAnalysis.data),
      hashes
    );
    const blueprint = await buildInterviewBlueprint(
      {
        job: JSON.stringify(jobAnalysis.data),
        candidate: JSON.stringify(candidateAnalysis.data),
        competencies: JSON.stringify(competencies.data),
        gaps: JSON.stringify(gaps.data),
      },
      hashes
    );

    await repo.deleteCompetenciesForProfile(profileId);
    const compRows = await repo.insertCompetencies(
      profileId,
      (competencies.data as CompetencyItem[]).map((c) => ({
        name: c.name,
        category: c.category,
        description: c.description,
        importance: c.importance,
        priority: c.priority,
        evidence_from_job: c.evidence_from_job,
        evidence_from_candidate: c.evidence_from_candidate,
        mastery_score: c.candidate_mastery,
        metadata_json: { ai_id: c.id },
      }))
    );

    const idMap = new Map<string, string>();
    (competencies.data as CompetencyItem[]).forEach((c, i) => {
      idMap.set(c.id, compRows[i]?.id as string);
    });

    const normalizedBlueprint = normalizeBlueprint(
      blueprint.data as unknown as Record<string, unknown>
    );

    const mappedContext = buildMappedContext({
      jobAnalysis: jobAnalysis.data,
      candidateAnalysis: candidateAnalysis.data,
      competencies: competencies.data as CompetencyItem[],
      gaps: gaps.data as GapItem[],
    });

    profile = await repo.updateProfile(userId, profileId, {
      status: 'ready',
      profession: jobAnalysis.data.profession,
      occupation: jobAnalysis.data.occupation,
      role: jobAnalysis.data.role,
      domain: jobAnalysis.data.domain,
      seniority: jobAnalysis.data.seniority,
      candidate_summary: candidateAnalysis.data.summary,
      job_summary: jobAnalysis.data.summary,
      job_analysis_json: jobAnalysis.data,
      candidate_analysis_json: candidateAnalysis.data,
      mapped_context_json: mappedContext,
      blueprint_json: normalizedBlueprint,
      gap_json: gaps.data,
      ai_metadata_json: blueprint.metadata,
      readiness_score: 0,
    });

    for (const comp of compRows) {
      await repo.upsertMastery(profileId, comp.id as string, {
        mastery_score: comp.mastery_score ?? 50,
        evidence_count: 1,
        last_assessed_at: new Date().toISOString(),
        trend: 'stable',
        confidence: 30,
      });
    }

    void idMap;
    const chained = await chainPrepareAfterAnalyze(userId, profileId);
    return { profile, status: 'ready' as const, ...chained };
  } catch (e) {
    await repo.updateProfile(userId, profileId, { status: 'failed' });
    throw e;
  }
}

export async function runPreparePipeline(
  userId: string,
  profileId: string,
  opts?: { force?: boolean }
) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile || profile.status !== 'ready') throw new Error('Profile not ready');

  if (opts?.force) {
    await repo.deletePlansForProfile(profileId);
  }

  const existing = await repo.getActivePlan(profileId);
  if (existing) {
    const topics = await repo.listTopics(existing.id as string);
    const prepQuestions = await repo.listPrepQuestions(profileId);
    return { plan: existing, topics, prep_questions: prepQuestions };
  }

  let mappedContext = await ensureMappedContextForProfile(userId, profile);
  const competencies = await repo.listCompetencies(profileId);
  const seededTopics = seedPreparationTopicsFromProfile(profile);

  let planTitle: string;
  let planJson: unknown;
  let topicInputs: Array<{ name: string; priority: number; competency_id?: string }>;

  if (seededTopics?.length) {
    planTitle = `Prep: ${seededTopics.map((t) => t.name).join(', ')}`.slice(0, 80);
    planJson = { title: planTitle, topics: seededTopics };
    topicInputs = seededTopics;
  } else {
    const competencyNames = competencies.map((c) => c.name).join(', ');
    const planResult = await generatePreparationTopics(
      mappedContextPrompt(mappedContext),
      competencyNames,
      {
        job: profile.source_job_hash as string,
        cv: profile.source_cv_hash as string,
      }
    );
    planTitle = planResult.data.title;
    planJson = planResult.data;
    topicInputs = planResult.data.topics;
  }

  await repo.deletePlansForProfile(profileId);
  const plan = await repo.insertPlan(profileId, {
    title: planTitle,
    duration_days: null,
    status: 'active',
    plan_json: planJson,
  });

  const compByAiId = new Map(
    competencies.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id])
  );
  const compByName = new Map(
    competencies.map((c) => [(c.name as string).trim().toLowerCase(), c.id as string])
  );

  const topics = await repo.insertTopics(
    plan.id as string,
    topicInputs.map((t) => ({
      name: t.name,
      priority: t.priority,
      competency_id: t.competency_id
        ? (compByAiId.get(t.competency_id) ?? null)
        : (compByName.get(t.name.trim().toLowerCase()) ?? null),
      status: 'pending',
    }))
  );

  mappedContext = updateMappedContextTopics(
    mappedContext,
    topicInputs.map((t) => t.name)
  );
  await repo.updateProfile(userId, profileId, { mapped_context_json: mappedContext });

  const prep_questions = await repo.listPrepQuestions(profileId);
  return { plan, topics, prep_questions };
}

export async function runQuizGeneration(
  userId: string,
  profileId: string,
  opts?: { topicId?: string; difficulty?: string; count?: number }
) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile?.blueprint_json) throw new Error('Profile not ready');

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const competencies = await repo.listCompetencies(profileId);
  const plan = await repo.getActivePlan(profileId);
  const topicRows = plan ? await repo.listTopics(plan.id as string) : [];
  if (!topicRows.length) {
    throw new InterviewError(
      'TOPICS_REQUIRED',
      'Generate preparation topics before starting a quiz.'
    );
  }

  const focusTopic = opts?.topicId
    ? topicRows.find((t) => t.id === opts.topicId)
    : null;
  if (opts?.topicId && !focusTopic) {
    throw new InterviewError('TOPIC_NOT_FOUND', 'Topic not found.');
  }

  const allNames = topicRows.map((t) => t.name as string).join(', ');

  const quizResult = await generateQuiz(
    mappedContextPrompt(mappedContext),
    compactCompetencyList(competencies),
    allNames || mappedContext.topic_names.join(', '),
    opts?.difficulty ?? 'medium',
    opts?.count ?? 5,
    { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string },
    focusTopic ? (focusTopic.name as string) : null
  );

  const defaultTitle = focusTopic
    ? `${focusTopic.name as string} quiz`
    : 'All topics quiz';

  const quiz = await repo.insertQuiz(profileId, {
    topic_id: opts?.topicId ?? null,
    title: quizResult.data.title?.trim() || defaultTitle,
    difficulty: opts?.difficulty ?? 'medium',
    question_count: quizResult.data.questions.length,
    metadata_json: quizResult.metadata,
  });

  const compByAiId = new Map(
    competencies.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id])
  );

  const questions = await repo.insertQuizQuestions(
    quiz.id as string,
    quizResult.data.questions.map((q, i) => ({
      sequence: i + 1,
      question_type: q.type,
      question_text: q.question,
      options_json: q.options ?? null,
      correct_answer_json: q.correct_answer ?? null,
      evaluation_rubric_json: q.evaluation_rubric ?? null,
      explanation: q.explanation ?? null,
      competency_id: q.competency_id ? compByAiId.get(q.competency_id) : null,
      difficulty: q.difficulty,
    }))
  );

  await repo.insertQuizAttempt(userId, quiz.id as string, {
    answers_json: { answers: {}, current_step: 0 },
    evaluation_json: null,
    completed_at: null,
  });

  return { quiz, questions };
}

const PREP_QUESTIONS_BATCH_SIZE = 5;

export async function runPrepQuestionBatch(
  userId: string,
  profileId: string,
  opts?: { topicId?: string | null }
) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile || profile.status !== 'ready') {
    throw new Error('Profile not ready');
  }
  if (!profile.mapped_context_json) {
    throw new Error('Profile not ready');
  }

  const plan = await repo.getActivePlan(profileId);
  const topicRows = plan ? await repo.listTopics(plan.id as string) : [];
  if (!topicRows.length) {
    throw new InterviewError(
      'TOPICS_REQUIRED',
      'Generate preparation topics before loading questions.'
    );
  }

  const matchable = topicRows.map((t) => ({
    id: t.id as string,
    name: t.name as string,
    priority: (t.priority as number | null) ?? null,
  }));

  const focusTopicId = opts?.topicId ?? null;
  const focusTopic = focusTopicId ? matchable.find((t) => t.id === focusTopicId) : null;
  if (focusTopicId && !focusTopic) {
    throw new InterviewError('TOPIC_NOT_FOUND', 'Topic not found.');
  }

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const competencies = await repo.listCompetencies(profileId);
  const existingQuestions = await repo.listPrepQuestionTexts(profileId, focusTopicId);
  const batchNumber = await repo.getNextPrepBatchNumber(profileId);
  let nextSequence = await repo.getNextPrepSequence(profileId);

  const isTopic = profile.prep_source === 'topic';
  const topicConfig = isTopic ? parseTopicPrepConfig(profile.topic_config_json) : null;
  const topicNames = matchable.map((t) => t.name);

  const batchResult =
    isTopic && topicConfig
      ? await generateTopicPrepQuestionBatch(
          {
            mappedContext: mappedContextPrompt(mappedContext),
            purpose: topicConfig.purpose,
            difficulty: topicConfig.difficulty,
            currentLevel:
              topicConfig.current_level ??
              (topicConfig.topics.length === 1
                ? skillLevelToExpertise(topicConfig.topics[0].skill_level)
                : 'intermediate'),
            goalLevel: topicConfig.goal_level,
            notes: topicConfig.notes,
            existingQuestions,
            count: PREP_QUESTIONS_BATCH_SIZE,
            topicNames,
            focusTopic: focusTopic?.name ?? null,
          },
          (profile.source_job_hash as string) ?? ''
        )
      : await generatePrepQuestionBatch(
          {
            mappedContext: mappedContextPrompt(mappedContext),
            seniority: (profile.seniority as string) ?? 'mid',
            interviewStage: (profile.interview_stage as string | null) ?? null,
            existingQuestions,
            count: PREP_QUESTIONS_BATCH_SIZE,
            topicNames,
            focusTopic: focusTopic?.name ?? null,
          },
          { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
        );

  const compByAiId = new Map(
    competencies.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id])
  );

  const rows = batchResult.data.questions.map((q) => {
    const topicId = focusTopic
      ? focusTopic.id
      : matchTopicId(q.topic_name, matchable);
    return {
      batch_number: batchNumber,
      sequence: nextSequence++,
      topic_id: topicId,
      question_type: q.type,
      question_text: q.question,
      competency_id: q.competency_id ? compByAiId.get(q.competency_id) : null,
      difficulty: q.difficulty,
      answer_text: q.answer_text,
      answer_source: 'ai',
      relevance: q.relevance,
      evidence_from_cv: q.evidence_from_cv ?? null,
      why_selected: q.why_selected ?? null,
      example_answer: null,
      ai_metadata_json: batchResult.metadata,
    };
  });

  const questions = await repo.insertPrepQuestions(profileId, rows);
  return { questions, batch_number: batchNumber };
}

export async function runGeneratePrepQuestionExample(userId: string, questionId: string) {
  const repo = getInterviewRepo();
  const question = await repo.getPrepQuestionById(userId, questionId);
  if (!question) throw new Error('Prep question not found');

  const existingExample = typeof question.example_answer === 'string' ? question.example_answer.trim() : '';
  if (existingExample) {
    return { question, input_tokens: 0, output_tokens: 0 };
  }

  const profile = await repo.getProfileById(userId, question.interview_profile_id as string);
  if (!profile || profile.status !== 'ready') {
    throw new Error('Profile not ready');
  }

  setAiUsageContext({ relatedId: profile.id as string });

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const result = await generatePrepQuestionExample({
    question: (question.question_text as string) ?? '',
    answer: (question.answer_text as string) ?? '',
    evidence: (question.evidence_from_cv as string | null) ?? null,
    relevance: (question.relevance as string) ?? 'supported',
    mappedContext: mappedContextPrompt(mappedContext),
    isTopic: profile.prep_source === 'topic',
  });

  const exampleAnswer = result.data.example_answer.trim();
  if (!exampleAnswer) throw new Error('ai_generation_failed');

  const updated = await repo.updatePrepQuestionExample(userId, questionId, exampleAnswer);
  return {
    question: updated,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
  };
}

export async function runExplainPrepQuestion(
  userId: string,
  questionId: string,
  opts: { message?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }
) {
  const repo = getInterviewRepo();
  const question = await repo.getPrepQuestionById(userId, questionId);
  if (!question) throw new Error('Prep question not found');

  const profile = await repo.getProfileById(userId, question.interview_profile_id as string);
  if (!profile || profile.status !== 'ready') {
    throw new Error('Profile not ready');
  }

  setAiUsageContext({ relatedId: profile.id as string });

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const result = await explainPrepQuestion({
    question: (question.question_text as string) ?? '',
    answer: displayPrepAnswer({
      answer_text: (question.answer_text as string) ?? '',
      example_answer: (question.example_answer as string | null) ?? null,
      answer_source: (question.answer_source as string) ?? 'ai',
    }),
    evidence: (question.evidence_from_cv as string | null) ?? null,
    mappedContext: mappedContextPrompt(mappedContext),
    history: opts.history ?? [],
    message: opts.message,
  });

  const explanation = result.data.explanation.trim();
  if (!explanation) throw new Error('ai_generation_failed');

  return {
    explanation,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
  };
}

export async function runReshapePrepQuestion(
  userId: string,
  questionId: string,
  opts: { draft: string; tone: string; targetChars: number }
) {
  const repo = getInterviewRepo();
  const question = await repo.getPrepQuestionById(userId, questionId);
  if (!question) throw new Error('Prep question not found');

  const profile = await repo.getProfileById(userId, question.interview_profile_id as string);
  if (!profile || profile.status !== 'ready') {
    throw new Error('Profile not ready');
  }

  setAiUsageContext({ relatedId: profile.id as string });

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const result = await reshapePrepQuestion({
    question: (question.question_text as string) ?? '',
    draft: opts.draft,
    tone: opts.tone,
    targetChars: opts.targetChars,
    mappedContext: mappedContextPrompt(mappedContext),
    isTopic: profile.prep_source === 'topic',
    evidence: (question.evidence_from_cv as string | null) ?? null,
  });

  const answerText = result.data.answer_text.trim();
  if (!answerText) throw new Error('ai_generation_failed');

  return {
    answer_text: answerText,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
  };
}

export async function runQuizSubmit(
  userId: string,
  quizId: string,
  answers: Array<{ question_id: string; answer: string }>
) {
  const repo = getInterviewRepo();
  const quiz = await repo.getQuiz(userId, quizId);
  if (!quiz) throw new Error('Quiz not found');

  const questions = await repo.listQuizQuestions(quizId);
  const profileId = quiz.interview_profile_id as string;

  let totalScore = 0;
  const evaluations: Record<string, unknown>[] = [];

  for (const q of questions) {
    const ans = answers.find((a) => a.question_id === q.id)?.answer ?? '';
    const qType = q.question_type as string;
    const correct = q.correct_answer_json;
    const result = evaluateQuizAnswerLocal(qType, correct, ans);
    totalScore += result.score;
    evaluations.push({
      question_id: q.id,
      correct: result.correct,
      score: result.score,
      user_answer: ans,
      correct_answer: correct,
      explanation: q.explanation ?? null,
    });
  }

  const score = Math.round((totalScore / Math.max(questions.length, 1)) * 10);
  const inProgress = await repo.getInProgressQuizAttempt(userId, quizId);
  const attempt = inProgress
    ? await repo.updateQuizAttempt(userId, inProgress.id as string, {
        score,
        answers_json: answers,
        evaluation_json: evaluations,
        completed_at: new Date().toISOString(),
      })
    : await repo.insertQuizAttempt(userId, quizId, {
        score,
        answers_json: answers,
        evaluation_json: evaluations,
        completed_at: new Date().toISOString(),
      });

  const readiness = await recalculateProfileProgress(userId, profileId);

  return { attempt, score, evaluations, readiness };
}

export async function startInterviewSession(
  userId: string,
  profileId: string,
  opts: { type?: string; mode?: string; difficulty?: string }
) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile?.blueprint_json) throw new Error('Profile not ready');

  const existing = await repo.getActiveSession(profileId);
  if (existing) {
    const questions = await repo.listQuestions(existing.id as string);
    const current = existing.current_question_id
      ? await repo.getQuestion(existing.id as string, existing.current_question_id as string)
      : null;
    return { session: existing, question: current, questions, resumed: true };
  }

  const blueprint = normalizedBlueprintFromProfile(profile);
  const strategy = blueprint.interview_strategy;
  const session = await repo.insertSession(profileId, {
    type: opts.type ?? 'mock',
    mode: opts.mode ?? 'practice',
    difficulty: opts.difficulty ?? strategy.difficulty,
    status: 'active',
    target_question_count: strategy.question_count,
    duration_minutes: strategy.duration_minutes,
    question_count: 0,
  });

  const question = await generateFirstQuestion(userId, profile, session.id as string);
  return { session: question.session, question: question.question, questions: [question.question], resumed: false };
}

async function generateFirstQuestion(
  userId: string,
  profile: Record<string, unknown>,
  sessionId: string
) {
  const repo = getInterviewRepo();
  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const competencies = await repo.listCompetencies(profile.id as string);
  const qResult = await generateInterviewQuestion(
    {
      mappedContext: mappedContextPrompt(mappedContext),
      sessionSummary: 'Interview starting. No prior questions.',
      competencyFocus: competencies[0]?.name as string,
      remainingTopics: mappedContext.topic_names.join(', '),
    },
    { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
  );

  const compByAiId = new Map(
    competencies.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id])
  );

  const question = await repo.insertQuestion(sessionId, {
    sequence: 1,
    question_type: qResult.data.type,
    question_text: qResult.data.question,
    competency_id: qResult.data.competency_id
      ? compByAiId.get(qResult.data.competency_id)
      : competencies[0]?.id,
    difficulty: qResult.data.difficulty,
    expected_points_json: qResult.data.expected_points,
    evaluation_rubric_json: qResult.data.evaluation_rubric,
  });

  const session = await repo.updateSession(userId, sessionId, {
    question_count: 1,
    current_question_id: question.id,
  });

  return { session, question };
}

export async function submitInterviewAnswer(
  userId: string,
  sessionId: string,
  input: {
    text_answer?: string;
    transcript?: string;
    audio_path?: string;
    duration_seconds?: number;
  }
) {
  const repo = getInterviewRepo();
  const session = await repo.getSession(userId, sessionId);
  if (!session || session.status !== 'active') throw new Error('Session not found');

  const profile = await repo.getProfileById(userId, session.interview_profile_id as string);
  if (!profile) throw new Error('Profile not found');

  const questionId = session.current_question_id as string;
  const question = await repo.getQuestion(sessionId, questionId);
  if (!question) throw new Error('Question not found');

  const answerText = input.transcript?.trim() || input.text_answer?.trim() || '';
  const priorAnswers = await repo.listQuestions(sessionId);
  const attemptNum = priorAnswers.filter((q) => q.id === questionId).length + 1;

  const answer = await repo.insertAnswer(questionId, {
    text_answer: input.text_answer ?? null,
    transcript: input.transcript ?? null,
    audio_path: input.audio_path ?? null,
    duration_seconds: input.duration_seconds ?? null,
    attempt_number: attemptNum,
  });

  const evaluation = await evaluateInterviewAnswer(
    {
      question: question.question_text as string,
      rubric: JSON.stringify(question.evaluation_rubric_json ?? []),
      answer: answerText,
      mode: session.mode as string,
    },
    { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
  );

  const evalRow = await repo.insertEvaluation(answer.id as string, {
    overall_score: Math.round(evaluation.data.overall_score * 10),
    dimension_scores_json: evaluation.data.dimension_scores,
    strengths_json: evaluation.data.strengths,
    weaknesses_json: evaluation.data.weaknesses,
    missing_points_json: evaluation.data.missing_points,
    feedback: evaluation.data.feedback,
    recommended_actions_json: [evaluation.data.recommended_action],
    ai_metadata_json: evaluation.metadata,
  });

  if (question.competency_id) {
    const masteryList = await repo.listMastery(profile.id as string);
    const m = masteryList.find((x) => x.competency_id === question.competency_id);
    const updated = updateMasteryScore(
      m?.mastery_score as number | null,
      evaluation.data.overall_score,
      ((m?.evidence_count as number) ?? 0) + 1
    );
    await repo.upsertMastery(profile.id as string, question.competency_id as string, {
      mastery_score: updated.masteryScore,
      trend: updated.trend,
      confidence: updated.confidence,
      evidence_count: ((m?.evidence_count as number) ?? 0) + 1,
      last_assessed_at: new Date().toISOString(),
    });
  }

  const questions = await repo.listQuestions(sessionId);
  const answeredPairs = await repo.listAnswersForSession(sessionId);
  const sessionSummary = summarizeSessionForAi(
    answeredPairs.map((p) => ({
      question_text: (p.question as Record<string, unknown>).question_text as string,
      sequence: (p.question as Record<string, unknown>).sequence as number,
    })),
    answeredPairs.map((p) => ({
      text_answer: (p.answer as Record<string, unknown>).text_answer as string | null,
      transcript: (p.answer as Record<string, unknown>).transcript as string | null,
    }))
  );

  const mappedContext = await ensureMappedContextForProfile(userId, profile);
  const remainingMinutes = sessionRemainingMinutes(session);
  const targetCount = (session.target_question_count as number) ?? 8;
  const currentDepth = followUpDepth(question, questions);
  const coveredCompetencies = new Set(
    answeredPairs.map((p) => (p.question as Record<string, unknown>).competency_id).filter(Boolean)
  );
  const remainingTopics = mappedContext.topic_names;

  let followUp = await decideFollowUp(
    {
      sessionSummary,
      lastEvaluation: JSON.stringify(evaluation.data),
      questionCount: session.question_count as number,
      targetCount,
      remainingMinutes: Math.round(remainingMinutes),
      followUpDepth: currentDepth,
      remainingTopics: remainingTopics.join(', ') || mappedContext.topic_names.join(', '),
    },
    { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
  );

  if (followUp.data.action === 'follow_up' && currentDepth >= 1) {
    followUp = {
      ...followUp,
      data: { ...followUp.data, action: 'next_competency' as const },
    };
  }

  let nextQuestion = null;
  const timeUp = remainingMinutes <= 0;
  const shouldComplete =
    timeUp ||
    followUp.data.action === 'complete' ||
    (session.question_count as number) >= targetCount;

  if (!shouldComplete) {
    const competencies = await repo.listCompetencies(profile.id as string);
    const compByAiId = new Map(
      competencies.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id])
    );
    const uncovered = competencies.filter((c) => !coveredCompetencies.has(c.id));
    const focusName =
      followUp.data.next_competency_id
        ? competencies.find(
            (c) => (c.metadata_json as { ai_id?: string })?.ai_id === followUp.data.next_competency_id
          )?.name
        : uncovered[0]?.name;

    const qResult = await generateInterviewQuestion(
      {
        mappedContext: mappedContextPrompt(mappedContext),
        sessionSummary,
        competencyFocus: (focusName as string) ?? undefined,
        remainingTopics: remainingTopics.join(', ') || mappedContext.topic_names.join(', '),
        difficulty: session.difficulty as string,
      },
      { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
    );
    nextQuestion = await repo.insertQuestion(sessionId, {
      sequence: (session.question_count as number) + 1,
      question_type: qResult.data.type,
      question_text: qResult.data.question,
      competency_id: qResult.data.competency_id
        ? compByAiId.get(qResult.data.competency_id)
        : null,
      difficulty: qResult.data.difficulty,
      expected_points_json: qResult.data.expected_points,
      evaluation_rubric_json: qResult.data.evaluation_rubric,
      parent_question_id: followUp.data.action === 'follow_up' ? questionId : null,
    });
    await repo.updateSession(userId, sessionId, {
      question_count: (session.question_count as number) + 1,
      current_question_id: nextQuestion.id,
      draft_answer: null,
    });
  } else {
    await repo.updateSession(userId, sessionId, {
      draft_answer: null,
      current_question_id: null,
    });
  }

  const showFeedback = session.mode === 'practice';
  return {
    evaluation: showFeedback ? evalRow : null,
    feedback: showFeedback ? evaluation.data : null,
    follow_up: followUp.data,
    next_question: nextQuestion,
    complete: shouldComplete,
  };
}

export async function completeInterviewSession(userId: string, sessionId: string) {
  const repo = getInterviewRepo();
  const session = await repo.getSession(userId, sessionId);
  if (!session) throw new Error('Session not found');

  const profile = await repo.getProfileById(userId, session.interview_profile_id as string);
  if (!profile) throw new Error('Profile not found');

  const questions = await repo.listQuestions(sessionId);
  const history = summarizeSessionForAi(
    questions.map((q) => ({ question_text: q.question_text as string, sequence: q.sequence as number })),
    questions.map(() => ({ text_answer: '', transcript: null }))
  );
  const mastery = await repo.listMastery(profile.id as string);
  const masterySummary = summarizeMasteryForAi(
    mastery.map((m) => ({
      name: m.name as string,
      mastery_score: m.mastery_score as number,
      trend: m.trend as string,
    }))
  );

  const report = await generateFinalReport(
    {
      blueprint: JSON.stringify(profile.blueprint_json),
      sessionHistory: history,
      masterySummary,
    },
    { job: profile.source_job_hash as string, cv: profile.source_cv_hash as string }
  );

  await repo.updateSession(userId, sessionId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    overall_score: Math.round(report.data.overall_score * 10),
    evaluation_json: report.data,
  });

  const readiness = await recalculateProfileProgress(userId, profile.id as string);

  return { report: report.data, readiness };
}

export async function getProfileDashboard(userId: string, profileId: string) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile) throw new Error('Profile not found');

  let jobTitle: string | undefined;
  let companyName: string | undefined;

  if (profile.job_id) {
    const jobs = getJobsRepo();
    const job = await jobs.getById(userId, profile.job_id as string);
    jobTitle = job?.job_title as string | undefined;
    companyName = job?.company_name as string | undefined;
  } else {
    const enriched = enrichProfileDisplay(profile as unknown as InterviewProfile);
    jobTitle = enriched.job_title;
    companyName = enriched.company_name;
  }

  const competencies = await repo.listCompetencies(profileId);
  const mastery = await repo.listMastery(profileId);
  const plan = await repo.getActivePlan(profileId);
  const topics = plan ? await repo.listTopics(plan.id as string) : [];
  const sessions = await repo.listSessions(profileId);
  const quizAttempts = await repo.listQuizAttemptsForProfile(userId, profileId);
  const inProgressQuiz = await repo.getInProgressQuizForProfile(userId, profileId);

  const readiness = calculateReadiness({
    topics,
    quizAttempts,
    sessions,
  });

  return {
    profile: {
      ...profile,
      job_title: jobTitle,
      company_name: companyName,
    },
    competencies,
    mastery,
    plan,
    topics,
    sessions,
    quiz_attempts: quizAttempts,
    in_progress_quiz: inProgressQuiz,
    readiness,
  };
}

const JOB_CONTEXT_MIN = 80;

function buildExtraContext(parts: Array<string | undefined | null>) {
  return parts.map((p) => p?.trim()).filter(Boolean).join('\n\n');
}

async function linkCvToJob(userId: string, cvId: string, jobId: string) {
  const cvs = getCvsRepo();
  const cv = await cvs.getById(userId, cvId);
  if (!cv) return;
  const jobIds = (cv.job_ids as string[] | undefined) ?? [];
  if (jobIds.includes(jobId)) return;
  await cvs.update(userId, cvId, { job_ids: [...jobIds, jobId] });
}

async function insertJobTopicsPlan(
  profileId: string,
  planResult: { title: string; topics: Array<{ name: string; priority: number; competency_id?: string }> }
) {
  const repo = getInterviewRepo();
  await repo.deletePlansForProfile(profileId);

  const plan = await repo.insertPlan(profileId, {
    title: planResult.title,
    duration_days: null,
    status: 'active',
    plan_json: planResult,
  });

  const compRows = await repo.listCompetencies(profileId);
  const compByAiId = new Map(
    compRows.map((c) => [(c.metadata_json as { ai_id?: string })?.ai_id, c.id as string])
  );
  const compByName = new Map(
    compRows.map((c) => [(c.name as string).trim().toLowerCase(), c.id as string])
  );

  const topics = await repo.insertTopics(
    plan.id as string,
    planResult.topics.map((t) => ({
      name: t.name,
      priority: t.priority,
      competency_id: t.competency_id
        ? (compByAiId.get(t.competency_id) ?? null)
        : (compByName.get(t.name.trim().toLowerCase()) ?? null),
      status: 'pending',
    }))
  );

  return { plan, topics };
}

export async function runFastJobStart(
  userId: string,
  jobId: string,
  opts?: {
    cvId?: string;
    extraContext?: string;
    interviewDate?: string;
    interviewStage?: string;
  }
) {
  const jobs = getJobsRepo();
  const repo = getInterviewRepo();
  const job = (await jobs.getById(userId, jobId)) as JobRow | null;
  if (!job) throw new Error('Job not found');

  const cv = await resolveCv(userId, jobId, opts?.cvId);
  if (!cv) throw new Error('CV not found');

  const keywords = Array.isArray(job.keywords) ? (job.keywords as string[]) : [];
  const jobHash = hashJobContext({
    jobTitle: job.job_title,
    companyName: job.company_name,
    jobSummary: job.job_summary,
    keywords,
    extraContext: opts?.extraContext,
  });
  const cvHash = hashCvContext(cv);
  const hashes = { job: jobHash, cv: cvHash };

  let profile = await repo.getProfileByJob(userId, jobId);
  if (profile?.status === 'ready' && profile.source_job_hash === jobHash && profile.source_cv_hash === cvHash) {
    const existing = await repo.getActivePlan(profile.id as string);
    if (existing) {
      return {
        profile,
        status: 'reused' as const,
        plan: existing,
        topics: await repo.listTopics(existing.id as string),
        prep_questions: await repo.listPrepQuestions(profile.id as string),
      };
    }
  }

  if (!profile) {
    profile = await repo.insertProfile(userId, {
      job_id: jobId,
      cv_id: cv.id,
      status: 'analyzing',
      source_job_hash: jobHash,
      source_cv_hash: cvHash,
      extra_context: opts?.extraContext ?? null,
      interview_date: opts?.interviewDate ?? null,
      interview_stage: opts?.interviewStage ?? null,
    });
  } else {
    profile = await repo.updateProfile(userId, profile.id as string, {
      status: 'analyzing',
      cv_id: cv.id,
      source_job_hash: jobHash,
      source_cv_hash: cvHash,
      extra_context: opts?.extraContext ?? profile.extra_context,
      ...(opts?.interviewDate ? { interview_date: opts.interviewDate } : {}),
      ...(opts?.interviewStage ? { interview_stage: opts.interviewStage } : {}),
    });
  }

  const profileId = profile.id as string;

  try {
    const cvSummary = buildCvSummary(cv);
    const jobSummary =
      typeof job.job_summary === 'string' && job.job_summary.trim()
        ? job.job_summary.trim()
        : (opts?.extraContext ?? '').slice(0, 2000);

    let mappedContext = buildJobSeedContext({
      jobTitle: job.job_title,
      companyName: job.company_name,
      jobSummary,
      keywords,
      cvSummary,
    });

    const seedComps = competenciesFromSeedTopics(
      keywords.length
        ? keywords.slice(0, 8).map((k, i) => ({ name: k, priority: i + 1 }))
        : [{ name: job.job_title, priority: 1 }],
      job.job_title
    );

    const planResult = await generatePreparationTopics(
      mappedContextPrompt(mappedContext),
      competencyNamesForAi(seedComps),
      hashes
    );

    const topicSeeds = planResult.data.topics.map((t) => ({
      name: t.name,
      priority: t.priority,
    }));
    const blueprint = seedBlueprintFromTopics(topicSeeds, 'intermediate');
    const topicCompetencies = competenciesFromSeedTopics(topicSeeds, job.job_title);

    await repo.deleteCompetenciesForProfile(profileId);
    await repo.insertCompetencies(
      profileId,
      topicCompetencies.map((c) => ({
        name: c.name,
        category: c.category,
        description: c.description,
        importance: c.importance,
        priority: c.priority,
        evidence_from_job: c.evidence_from_job,
        evidence_from_candidate: c.evidence_from_candidate,
        mastery_score: c.candidate_mastery,
        metadata_json: { ai_id: c.id },
      }))
    );

    mappedContext = updateMappedContextTopics(
      mappedContext,
      topicSeeds.map((t) => t.name)
    );

    profile = await repo.updateProfile(userId, profileId, {
      status: 'ready',
      role: job.job_title,
      seniority: 'mid',
      profession: job.job_title,
      candidate_summary: cvSummary.slice(0, 600),
      job_summary: jobSummary.slice(0, 600),
      mapped_context_json: mappedContext,
      blueprint_json: blueprint,
      gap_json: [],
      ai_metadata_json: planResult.metadata,
      readiness_score: 0,
      clarification_json: { needs_clarification: false, questions: [] },
    });

    const { plan, topics } = await insertJobTopicsPlan(profileId, planResult.data);
    const prep_questions = await repo.listPrepQuestions(profileId);

    return {
      profile,
      status: 'ready' as const,
      plan,
      topics,
      prep_questions,
    };
  } catch (e) {
    await repo.updateProfile(userId, profileId, { status: 'failed' });
    throw e;
  }
}

export async function retryJobInterview(userId: string, profileId: string) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile?.job_id) {
    throw new InterviewError('PROFILE_NOT_FOUND', 'Job profile not found.');
  }
  return runFastJobStart(userId, profile.job_id as string, {
    cvId: profile.cv_id as string | undefined,
    extraContext: (profile.extra_context as string | null) ?? undefined,
    interviewDate: (profile.interview_date as string | null) ?? undefined,
    interviewStage: (profile.interview_stage as string | null) ?? undefined,
  });
}

export async function startInterviewFromJob(
  userId: string,
  input: {
    jobId: string;
    cvId?: string;
    extraContext?: string;
    interviewDate?: string;
    interviewStage?: string;
    jobDescription?: string;
  }
) {
  const jobs = getJobsRepo();
  const job = await jobs.getById(userId, input.jobId);
  if (!job) throw new InterviewError('JOB_NOT_FOUND', 'Job not found.');

  const summary = typeof job.job_summary === 'string' ? job.job_summary.trim() : '';
  const jd = input.jobDescription?.trim() ?? '';
  if (summary.length < JOB_CONTEXT_MIN && jd.length < JOB_CONTEXT_MIN) {
    throw new InterviewError(
      'JOB_CONTEXT_INSUFFICIENT',
      'Paste a job description (at least 100 characters) to start preparation.'
    );
  }

  let cvId = input.cvId;
  if (!cvId) {
    const cv = await resolveCv(userId, input.jobId);
    if (!cv) {
      throw new InterviewError(
        'CV_NOT_FOUND',
        'Create a CV in Documents before starting interview preparation.'
      );
    }
    cvId = cv.id as string;
  } else {
    const cv = await getCvsRepo().getById(userId, cvId);
    if (!cv) {
      throw new InterviewError(
        'CV_NOT_FOUND',
        'Create a CV in Documents before starting interview preparation.'
      );
    }
  }

  if (jd.length >= JOB_CONTEXT_MIN) {
    await jobs.update(userId, input.jobId, {
      job_summary: jd.slice(0, 4000),
    });
  }

  const extraContext = buildExtraContext([
    jd.length >= JOB_CONTEXT_MIN ? jd : undefined,
    input.extraContext,
    input.interviewDate ? `Interview date: ${input.interviewDate}` : undefined,
    input.interviewStage ? `Interview stage: ${input.interviewStage}` : undefined,
  ]);

  const result = await runFastJobStart(userId, input.jobId, {
    cvId,
    extraContext: extraContext || undefined,
    interviewDate: input.interviewDate,
    interviewStage: input.interviewStage,
  });

  return { ...result, job_id: input.jobId };
}

export async function startInterviewFromManualJob(
  userId: string,
  input: {
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    cvId: string;
    jobUrl?: string;
    interviewDate?: string;
    interviewStage?: string;
    extraContext?: string;
  }
) {
  const jd = input.jobDescription.trim();
  if (jd.length < 100) {
    throw new InterviewError(
      'JOB_CONTEXT_INSUFFICIENT',
      'Paste a job description (at least 100 characters).'
    );
  }

  const cv = await getCvsRepo().getById(userId, input.cvId);
  if (!cv) {
    throw new InterviewError(
      'CV_NOT_FOUND',
      'Create a CV in Documents before starting interview preparation.'
    );
  }

  const job = await getJobsRepo().insert(userId, {
    job_title: input.jobTitle.trim() || 'Untitled role',
    company_name: input.companyName.trim() || 'Company',
    job_url: input.jobUrl?.trim() || null,
    keywords: [],
    job_summary: jd.slice(0, 4000) || null,
    status: 'applied',
  });

  const jobId = job.id as string;
  await linkCvToJob(userId, input.cvId, jobId);

  const extraContext = buildExtraContext([
    jd,
    input.extraContext,
    input.interviewDate ? `Interview date: ${input.interviewDate}` : undefined,
    input.interviewStage ? `Interview stage: ${input.interviewStage}` : undefined,
  ]);

  const result = await runFastJobStart(userId, jobId, {
    cvId: input.cvId,
    extraContext,
    interviewDate: input.interviewDate,
    interviewStage: input.interviewStage,
  });

  return { ...result, job_id: jobId };
}
