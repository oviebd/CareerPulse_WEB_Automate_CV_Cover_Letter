import { isQuizQuestionType } from '@/lib/interview/quiz-eval';
import { clampPrepAnswer } from '@/lib/interview/prep-answer';
import type {
  AnswerEvaluation,
  CandidateInterviewAnalysis,
  ClarificationPayload,
  CompetencyItem,
  FinalReport,
  FollowUpAction,
  FollowUpDecision,
  GapItem,
  InterviewBlueprint,
  InterviewQuestionOutput,
  JobInterviewAnalysis,
  PreparationPlanOutput,
  PrepQuestionBatchOutput,
  PrepQuestionOutput,
  PrepQuestionRelevance,
  QuizOutput,
  QuizQuestionOutput,
  TopicInterviewAnalysis,
} from '@/types/interview';

const FOLLOW_UP_ACTIONS: FollowUpAction[] = [
  'follow_up',
  'clarify',
  'next_competency',
  'revisit_weak',
  'complete',
];

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function importance(v: unknown): CompetencyItem['importance'] {
  const s = str(v).toLowerCase();
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low') return s;
  return 'medium';
}

export function normalizeJobAnalysis(raw: Record<string, unknown>): JobInterviewAnalysis {
  return {
    profession: str(raw.profession) || 'general',
    occupation: str(raw.occupation) || 'professional',
    role: str(raw.role) || 'role',
    domain: str(raw.domain) || 'general',
    seniority: str(raw.seniority) || 'mid',
    responsibilities: strArr(raw.responsibilities),
    required_competencies: strArr(raw.required_competencies),
    preferred_competencies: strArr(raw.preferred_competencies),
    experience_expectations: strArr(raw.experience_expectations),
    likely_interview_methods: strArr(raw.likely_interview_methods),
    evaluation_dimensions: strArr(raw.evaluation_dimensions),
    summary: str(raw.summary),
  };
}

export function normalizeCandidateAnalysis(
  raw: Record<string, unknown>
): CandidateInterviewAnalysis {
  return {
    skills: strArr(raw.skills),
    experience_highlights: strArr(raw.experience_highlights),
    achievements: strArr(raw.achievements),
    domain_experience: strArr(raw.domain_experience),
    potential_gaps: strArr(raw.potential_gaps),
    summary: str(raw.summary),
  };
}

export function normalizeCompetencies(raw: unknown): CompetencyItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      const name = str(o.name);
      if (!name) return null;
      return {
        id: str(o.id) || `comp-${i + 1}`,
        name,
        category: str(o.category) || 'general',
        description: str(o.description),
        importance: importance(o.importance),
        priority: num(o.priority, 1, 100, 50),
        evidence_from_job: str(o.evidence_from_job),
        evidence_from_candidate: str(o.evidence_from_candidate),
        candidate_mastery: num(o.candidate_mastery, 0, 100, 50),
      };
    })
    .filter((x): x is CompetencyItem => x !== null);
}

export function normalizeGapAnalysis(raw: unknown): GapItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const name = str(o.competency_name);
      if (!name) return null;
      const pri = str(o.priority).toLowerCase();
      return {
        competency_id: str(o.competency_id) || name.toLowerCase().replace(/\s+/g, '_'),
        competency_name: name,
        required_level: str(o.required_level) || 'high',
        candidate_evidence: str(o.candidate_evidence),
        practice_score:
          o.practice_score == null ? null : num(o.practice_score, 0, 100, 0),
        priority: pri === 'high' || pri === 'low' ? pri : 'medium',
        rationale: str(o.rationale),
      };
    })
    .filter((x): x is GapItem => x !== null);
}

export function normalizeBlueprint(raw: Record<string, unknown>): InterviewBlueprint {
  const strategy = (raw.interview_strategy ?? {}) as Record<string, unknown>;
  const prep = (raw.preparation ?? {}) as Record<string, unknown>;
  const quiz = (raw.quiz ?? {}) as Record<string, unknown>;
  const mock = (raw.mock_interview ?? {}) as Record<string, unknown>;
  return {
    job_context: (raw.job_context as Record<string, unknown>) ?? {},
    candidate_context: (raw.candidate_context as Record<string, unknown>) ?? {},
    interview_strategy: {
      objectives: strArr(strategy.objectives),
      evaluation_dimensions: strArr(strategy.evaluation_dimensions),
      question_categories: strArr(strategy.question_categories),
      question_count: num(strategy.question_count, 5, 10, 8),
      duration_minutes: num(strategy.duration_minutes, 15, 45, 25),
      difficulty: str(strategy.difficulty) || 'job_level',
      adaptive: strategy.adaptive !== false,
    },
    preparation: {
      topics: Array.isArray(prep.topics)
        ? (prep.topics as Record<string, unknown>[]).map((t) => ({
            name: str(t.name),
            priority: num(t.priority, 1, 100, 50),
            estimated_minutes: num(t.estimated_minutes, 5, 480, 30),
          }))
        : [],
      priority_order: strArr(prep.priority_order),
      learning_objectives: strArr(prep.learning_objectives),
    },
    quiz: {
      question_types: strArr(quiz.question_types).length
        ? strArr(quiz.question_types)
        : ['single_choice', 'multiple_select', 'true_false', 'scenario'],
      difficulty: str(quiz.difficulty) || 'adaptive',
    },
    mock_interview: {
      question_types: strArr(mock.question_types).length
        ? strArr(mock.question_types)
        : ['behavioral', 'scenario', 'experience'],
      follow_up_strategy: (mock.follow_up_strategy as Record<string, unknown>) ?? {},
      evaluation_strategy: (mock.evaluation_strategy as Record<string, unknown>) ?? {},
    },
  };
}

export function normalizeClarification(raw: Record<string, unknown>): ClarificationPayload {
  const questions = Array.isArray(raw.questions)
    ? (raw.questions as Record<string, unknown>[])
        .map((q, i) => ({
          id: str(q.id) || `q-${i + 1}`,
          question: str(q.question),
          reason: str(q.reason),
          optional: q.optional !== false,
        }))
        .filter((q) => q.question)
    : [];
  return {
    needs_clarification: raw.needs_clarification === true && questions.length > 0,
    questions,
  };
}

export function normalizePreparationPlan(raw: Record<string, unknown>): PreparationPlanOutput {
  const topics = Array.isArray(raw.topics)
    ? (raw.topics as Record<string, unknown>[])
        .map((t) => ({
          name: str(t.name),
          priority: num(t.priority, 1, 100, 50),
          competency_id: str(t.competency_id) || undefined,
        }))
        .filter((t) => t.name)
        .slice(0, 10)
    : [];
  const durationRaw = raw.duration_days;
  const duration_days =
    durationRaw === null || durationRaw === undefined
      ? undefined
      : num(durationRaw, 1, 60, 7);
  return {
    title: str(raw.title) || 'Interview preparation topics',
    duration_days,
    days: Array.isArray(raw.days)
      ? (raw.days as Record<string, unknown>[]).map((d) => ({
          day: num(d.day, 1, 60, 1),
          topics: strArr(d.topics),
          activities: strArr(d.activities),
        }))
      : [],
    topics,
  };
}

export function normalizeQuizOutput(raw: Record<string, unknown>): QuizOutput {
  const questions = Array.isArray(raw.questions)
    ? (raw.questions as Record<string, unknown>[])
        .map((q) => normalizeQuizQuestion(q))
        .filter((q): q is QuizQuestionOutput => Boolean(q?.question))
    : [];
  if (!questions.length) {
    throw new Error('Quiz must include at least one valid objective question');
  }
  return {
    title: str(raw.title) || 'Practice Quiz',
    questions,
  };
}

function normalizeQuizType(rawType: string): QuizQuestionOutput['type'] | null {
  const type = rawType.trim().toLowerCase();
  if (type === 'multiple_choice') return 'single_choice';
  return isQuizQuestionType(type) ? type : null;
}

function hasValidCorrectAnswer(
  type: QuizQuestionOutput['type'],
  correctAnswer: QuizQuestionOutput['correct_answer']
): boolean {
  if (type === 'true_false') {
    return (
      correctAnswer === true ||
      correctAnswer === false ||
      correctAnswer === 'true' ||
      correctAnswer === 'false'
    );
  }
  if (type === 'multiple_select') {
    return Array.isArray(correctAnswer) && correctAnswer.length > 0;
  }
  return typeof correctAnswer === 'string' && correctAnswer.trim().length > 0;
}

export function normalizeQuizQuestion(
  raw: Record<string, unknown>
): QuizQuestionOutput | null {
  const question = str(raw.question);
  if (!question) return null;

  const type = normalizeQuizType(str(raw.type));
  if (!type) return null;

  const options = strArr(raw.options);
  const correctAnswer = raw.correct_answer as QuizQuestionOutput['correct_answer'];
  if (!hasValidCorrectAnswer(type, correctAnswer)) return null;

  if ((type === 'single_choice' || type === 'scenario' || type === 'multiple_select') && options.length < 2) {
    return null;
  }

  return {
    question,
    type,
    competency_id: str(raw.competency_id) || undefined,
    difficulty: str(raw.difficulty) || 'medium',
    options:
      type === 'true_false'
        ? undefined
        : options.length
          ? options
          : undefined,
    correct_answer: correctAnswer,
    explanation: str(raw.explanation) || undefined,
  };
}

export function normalizeAnswerEvaluation(raw: Record<string, unknown>): AnswerEvaluation {
  const action = str(raw.recommended_action) as FollowUpAction;
  return {
    overall_score: num(raw.overall_score, 0, 10, 5),
    dimension_scores: Array.isArray(raw.dimension_scores)
      ? (raw.dimension_scores as Record<string, unknown>[]).map((d) => ({
          name: str(d.name) || 'General',
          score: num(d.score, 0, 10, 5),
          feedback: str(d.feedback),
        }))
      : [],
    strengths: strArr(raw.strengths),
    weaknesses: strArr(raw.weaknesses),
    missing_points: strArr(raw.missing_points),
    feedback: str(raw.feedback),
    follow_up_needed: raw.follow_up_needed === true,
    recommended_action: FOLLOW_UP_ACTIONS.includes(action) ? action : 'next_competency',
  };
}

export function normalizeInterviewQuestion(
  raw: Record<string, unknown>
): InterviewQuestionOutput {
  return {
    question: str(raw.question),
    type: str(raw.type) || 'behavioral',
    competency_id: str(raw.competency_id) || undefined,
    difficulty: str(raw.difficulty) || 'medium',
    expected_points: strArr(raw.expected_points),
    evaluation_rubric: strArr(raw.evaluation_rubric),
  };
}

export function normalizeFollowUpDecision(raw: Record<string, unknown>): FollowUpDecision {
  const action = str(raw.action) as FollowUpAction;
  return {
    action: FOLLOW_UP_ACTIONS.includes(action) ? action : 'next_competency',
    rationale: str(raw.rationale),
    next_competency_id: str(raw.next_competency_id) || undefined,
  };
}

export function normalizeFinalReport(raw: Record<string, unknown>): FinalReport {
  return {
    overall_score: num(raw.overall_score, 0, 10, 5),
    readiness_score: num(raw.readiness_score, 0, 100, 50),
    dimensions: Array.isArray(raw.dimensions)
      ? (raw.dimensions as Record<string, unknown>[]).map((d) => ({
          name: str(d.name) || 'General',
          score: num(d.score, 0, 10, 5),
          feedback: str(d.feedback),
        }))
      : [],
    strengths: strArr(raw.strengths),
    weaknesses: strArr(raw.weaknesses),
    missing_areas: strArr(raw.missing_areas),
    question_review: Array.isArray(raw.question_review)
      ? (raw.question_review as Record<string, unknown>[]).map((q) => ({
          question: str(q.question),
          answer_summary: str(q.answer_summary),
          score: num(q.score, 0, 10, 5),
          feedback: str(q.feedback),
        }))
      : [],
    recommendations: strArr(raw.recommendations),
    improvement_trend: str(raw.improvement_trend),
  };
}

function prepRelevance(v: unknown, evidence: string): PrepQuestionRelevance {
  const s = str(v).toLowerCase();
  if (s === 'irrelevant' || !evidence) return 'irrelevant';
  return 'supported';
}

export function normalizePrepQuestion(raw: Record<string, unknown>): PrepQuestionOutput {
  const evidence = str(raw.evidence_from_cv);
  const relevance = prepRelevance(raw.relevance, evidence);
  const answerText = str(raw.answer_text);
  return {
    question: str(raw.question),
    type: str(raw.type) || 'behavioral',
    competency_id: str(raw.competency_id) || undefined,
    difficulty: str(raw.difficulty) || 'medium',
    answer_text: clampPrepAnswer(
      relevance === 'irrelevant'
        ? answerText || 'Irrelevant experience — no matching evidence in your CV for this question.'
        : answerText
    ),
    relevance,
    evidence_from_cv: evidence || undefined,
    why_selected: str(raw.why_selected) || undefined,
    topic_name: str(raw.topic_name) || undefined,
    example_answer: str(raw.example_answer) || undefined,
  };
}

export function normalizePrepQuestionBatch(raw: Record<string, unknown>): PrepQuestionBatchOutput {
  const questions = Array.isArray(raw.questions)
    ? (raw.questions as Record<string, unknown>[])
        .map((q) => normalizePrepQuestion(q))
        .filter((q): q is PrepQuestionOutput => Boolean(q.question))
    : [];
  return { questions };
}

export function normalizeTopicPrepQuestion(raw: Record<string, unknown>): PrepQuestionOutput {
  const answerText = str(raw.answer_text);
  return {
    question: str(raw.question),
    type: str(raw.type) || 'conceptual',
    competency_id: str(raw.competency_id) || undefined,
    difficulty: str(raw.difficulty) || 'medium',
    answer_text: clampPrepAnswer(answerText),
    relevance: 'supported',
    evidence_from_cv: str(raw.key_points) || undefined,
    why_selected: str(raw.why_selected) || undefined,
    topic_name: str(raw.topic_name) || undefined,
    example_answer: str(raw.example_answer) || undefined,
  };
}

export function normalizeExampleAnswer(raw: Record<string, unknown>): { example_answer: string } {
  return { example_answer: clampPrepAnswer(str(raw.example_answer)) };
}

export function normalizeExplanation(raw: Record<string, unknown>): { explanation: string } {
  return { explanation: str(raw.explanation) };
}

export function normalizeReshapedAnswer(raw: Record<string, unknown>): { answer_text: string } {
  return { answer_text: clampPrepAnswer(str(raw.answer_text)) };
}

export function normalizeTopicPrepQuestionBatch(
  raw: Record<string, unknown>
): PrepQuestionBatchOutput {
  const questions = Array.isArray(raw.questions)
    ? (raw.questions as Record<string, unknown>[])
        .map((q) => normalizeTopicPrepQuestion(q))
        .filter((q): q is PrepQuestionOutput => Boolean(q.question))
    : [];
  return { questions };
}

export function normalizeTopicAnalysis(raw: Record<string, unknown>): TopicInterviewAnalysis {
  return {
    profession: str(raw.profession) || 'general',
    occupation: str(raw.occupation) || 'professional',
    role: str(raw.role) || 'learner',
    domain: str(raw.domain) || 'general',
    seniority: str(raw.seniority) || 'mid',
    focus_areas: strArr(raw.focus_areas),
    learning_objectives: strArr(raw.learning_objectives),
    likely_question_types: strArr(raw.likely_question_types),
    evaluation_dimensions: strArr(raw.evaluation_dimensions),
    candidate_strengths: strArr(raw.candidate_strengths),
    candidate_gaps: strArr(raw.candidate_gaps),
    summary: str(raw.summary),
  };
}

export function normalizeTopicPipelineOutput(raw: Record<string, unknown>): {
  analysis: TopicInterviewAnalysis;
  competencies: CompetencyItem[];
  blueprint: InterviewBlueprint;
} {
  const analysis = normalizeTopicAnalysis(
    (raw.analysis as Record<string, unknown>) ?? raw
  );
  const competencies = normalizeCompetencies(raw.competencies);
  const blueprint = normalizeBlueprint(
    (raw.blueprint as Record<string, unknown>) ?? {}
  );
  return { analysis, competencies, blueprint };
}
