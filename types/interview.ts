/** Interview Preparation domain types — profession-agnostic, AI-driven fields are strings. */

export type InterviewProfileStatus =
  | 'idle'
  | 'analyzing'
  | 'needs_clarification'
  | 'ready'
  | 'failed';

export type InterviewSessionMode = 'practice' | 'realistic';
export type InterviewSessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type AnswerChannel = 'text' | 'voice';

export type FollowUpAction =
  | 'follow_up'
  | 'clarify'
  | 'next_competency'
  | 'revisit_weak'
  | 'complete';

export interface AiMetadata {
  model: string;
  prompt_version: string;
  source_job_hash?: string;
  source_cv_hash?: string;
  generated_at: string;
}

export interface JobInterviewAnalysis {
  profession: string;
  occupation: string;
  role: string;
  domain: string;
  seniority: string;
  responsibilities: string[];
  required_competencies: string[];
  preferred_competencies: string[];
  experience_expectations: string[];
  likely_interview_methods: string[];
  evaluation_dimensions: string[];
  summary: string;
}

export interface CandidateInterviewAnalysis {
  skills: string[];
  experience_highlights: string[];
  achievements: string[];
  domain_experience: string[];
  potential_gaps: string[];
  summary: string;
}

export interface CompetencyItem {
  id: string;
  name: string;
  category: string;
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
  evidence_from_job: string;
  evidence_from_candidate: string;
  candidate_mastery: number;
}

export interface GapItem {
  competency_id: string;
  competency_name: string;
  required_level: string;
  candidate_evidence: string;
  practice_score: number | null;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
}

export interface InterviewBlueprint {
  job_context: Record<string, unknown>;
  candidate_context: Record<string, unknown>;
  interview_strategy: {
    objectives: string[];
    evaluation_dimensions: string[];
    question_categories: string[];
    question_count: number;
    duration_minutes: number;
    difficulty: string;
    adaptive: boolean;
  };
  preparation: {
    topics: Array<{ name: string; priority: number; estimated_minutes: number }>;
    priority_order: string[];
    learning_objectives: string[];
  };
  quiz: { question_types: string[]; difficulty: string };
  mock_interview: {
    question_types: string[];
    follow_up_strategy: Record<string, unknown>;
    evaluation_strategy: Record<string, unknown>;
  };
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  reason: string;
  optional: boolean;
}

export interface ClarificationPayload {
  needs_clarification: boolean;
  questions: ClarificationQuestion[];
  answers?: Record<string, string>;
}

export interface PreparationPlanDay {
  day: number;
  topics: string[];
  activities: string[];
}

export interface PreparationPlanOutput {
  title: string;
  duration_days?: number;
  days?: PreparationPlanDay[];
  topics: Array<{
    name: string;
    priority: number;
    competency_id?: string;
  }>;
}

export interface MappedInterviewContext {
  brief: string;
  role: string;
  seniority: string;
  profession: string;
  job_must_haves: string[];
  job_responsibilities: string[];
  candidate_strengths: string[];
  candidate_experience: string[];
  candidate_gaps: string[];
  competency_focus: Array<{ id: string; name: string; importance: string }>;
  topic_names: string[];
  generated_at: string;
  /** Topic prep only */
  source?: 'job' | 'topic';
  purpose?: 'learning' | 'interview' | 'work';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  current_level?: TopicExpertiseLevel;
  notes?: string;
  self_rated_skills?: Array<{ name: string; skill_level: number }>;
}

export interface QuizQuestionOutput {
  question: string;
  type: string;
  competency_id?: string;
  difficulty: string;
  options?: string[];
  correct_answer?: string | string[] | boolean;
  explanation?: string;
  evaluation_rubric?: string[];
}

export interface QuizOutput {
  title: string;
  questions: QuizQuestionOutput[];
}

export type PrepQuestionRelevance = 'supported' | 'irrelevant';
export type PrepQuestionAnswerSource = 'ai' | 'user';

export interface PrepQuestionOutput {
  question: string;
  type: string;
  competency_id?: string;
  difficulty: string;
  answer_text: string;
  relevance: PrepQuestionRelevance;
  evidence_from_cv?: string;
  why_selected?: string;
  topic_name?: string;
  example_answer?: string;
}

export type PrepExplainRole = 'user' | 'assistant';

export interface PrepExplainTurn {
  role: PrepExplainRole;
  content: string;
}

export interface PrepQuestionBatchOutput {
  questions: PrepQuestionOutput[];
}

export interface PrepQuestion {
  id: string;
  interview_profile_id: string;
  topic_id: string | null;
  topic_name: string | null;
  batch_number: number;
  sequence: number;
  question_type: string;
  question_text: string;
  competency_id: string | null;
  difficulty: string | null;
  answer_text: string;
  answer_source: PrepQuestionAnswerSource;
  relevance: PrepQuestionRelevance;
  evidence_from_cv: string | null;
  why_selected: string | null;
  example_answer: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerEvaluation {
  overall_score: number;
  dimension_scores: Array<{ name: string; score: number; feedback: string }>;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
  feedback: string;
  follow_up_needed: boolean;
  recommended_action: FollowUpAction;
}

export interface InterviewQuestionOutput {
  question: string;
  type: string;
  competency_id?: string;
  difficulty: string;
  expected_points: string[];
  evaluation_rubric: string[];
}

export interface FollowUpDecision {
  action: FollowUpAction;
  rationale: string;
  next_competency_id?: string;
}

/** Single AI turn: evaluate last answer and optionally generate next question. */
export interface InterviewTurnResult {
  overall_score: number;
  dimension_scores: Array<{ name: string; score: number; feedback: string }>;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
  feedback: string;
  action: FollowUpAction;
  next_question: InterviewQuestionOutput | null;
}

export interface FinalReport {
  overall_score: number;
  readiness_score: number;
  dimensions: Array<{ name: string; score: number; feedback: string }>;
  strengths: string[];
  weaknesses: string[];
  missing_areas: string[];
  question_review: Array<{
    question: string;
    answer_summary: string;
    score: number;
    feedback: string;
  }>;
  recommendations: string[];
  improvement_trend: string;
}

export interface ReadinessBreakdown {
  overall: number;
  topic_points: number;
  quiz_points: number;
  mock_points: number;
  topics_done: number;
  topics_total: number;
  quiz_completed: boolean;
  mock_completed: boolean;
  next_action: string;
}

export type PrepSource = 'job' | 'topic';

export type TopicPrepPurpose = 'learning' | 'interview' | 'work';
export type TopicPrepDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TopicExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export interface TopicPrepTopicItem {
  name: string;
  skill_level: 1 | 2 | 3 | 4 | 5;
}

export interface TopicPrepConfig {
  purpose: TopicPrepPurpose;
  difficulty: TopicPrepDifficulty;
  goal_role: string;
  goal_level: string;
  /** Starting expertise (new simplified form); derived from topics for legacy profiles */
  current_level?: TopicExpertiseLevel;
  notes?: string;
  topics: TopicPrepTopicItem[];
}

export interface TopicInterviewAnalysis {
  profession: string;
  occupation: string;
  role: string;
  domain: string;
  seniority: string;
  focus_areas: string[];
  learning_objectives: string[];
  likely_question_types: string[];
  evaluation_dimensions: string[];
  candidate_strengths: string[];
  candidate_gaps: string[];
  summary: string;
}

export interface InterviewProfile {
  id: string;
  user_id: string;
  job_id: string | null;
  cv_id: string | null;
  prep_source: PrepSource;
  topic_config_json: TopicPrepConfig | null;
  status: InterviewProfileStatus;
  profession: string | null;
  occupation: string | null;
  role: string | null;
  domain: string | null;
  seniority: string | null;
  interview_stage: string | null;
  interview_date: string | null;
  candidate_summary: string | null;
  job_summary: string | null;
  blueprint_json: InterviewBlueprint | null;
  gap_json: GapItem[] | null;
  clarification_json: ClarificationPayload | null;
  readiness_score: number | null;
  created_at: string;
  updated_at: string;
  job_title?: string;
  company_name?: string;
}

import type { JobStatus } from '@/types/database';

export interface EligibleInterviewJob {
  id: string;
  job_title: string;
  company_name: string;
  status: JobStatus;
  job_summary: string | null;
  needs_job_context: boolean;
  has_cv: boolean;
  linked_cv_id: string | null;
}

export interface InterviewDashboard {
  profiles: InterviewProfile[];
  eligible_jobs: EligibleInterviewJob[];
}
