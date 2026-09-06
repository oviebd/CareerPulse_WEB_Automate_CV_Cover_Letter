import { normalizeBlueprint } from '@/lib/interview/validators';
import {
  expertiseLabel,
  purposeLabel,
  skillLevelToExpertise,
} from '@/lib/interview/topic-config';
import type {
  CompetencyItem,
  InterviewBlueprint,
  MappedInterviewContext,
  TopicPrepConfig,
  TopicPrepPurpose,
} from '@/types/interview';

export type SeedTopic = { name: string; priority: number };

function skillToMastery(skillLevel: number): number {
  return Math.min(100, Math.max(20, skillLevel * 20));
}

function purposeBriefLabel(purpose: TopicPrepPurpose): string {
  return purposeLabel(purpose);
}

export function buildTopicSeedContext(config: TopicPrepConfig): MappedInterviewContext {
  const currentLevel =
    config.current_level ??
    (config.topics.length === 1 ? skillLevelToExpertise(config.topics[0].skill_level) : 'intermediate');
  const goalLevel = config.goal_level;
  const topicNames = config.topics.map((t) => t.name);

  const strengths = config.topics
    .filter((t) => t.skill_level >= 3)
    .map((t) => `${t.name} (current: ${expertiseLabel(currentLevel)})`);
  const gaps = config.topics
    .filter((t) => t.skill_level < 3)
    .map((t) => `${t.name} (needs practice from ${expertiseLabel(currentLevel)})`);

  const briefParts = [
    `Topic prep: ${topicNames.join(', ')}.`,
    `Purpose: ${purposeBriefLabel(config.purpose)}.`,
    `Current level: ${expertiseLabel(currentLevel)}. Goal: ${expertiseLabel(goalLevel)}.`,
  ];
  if (config.notes?.trim()) {
    briefParts.push(`Note: ${config.notes.trim()}.`);
  }
  const brief = briefParts.join(' ').slice(0, 600);

  const competencyFocus = config.topics.map((t, i) => ({
    id: `comp-${i + 1}`,
    name: t.name,
    importance: t.skill_level >= 4 ? 'high' : t.skill_level >= 3 ? 'medium' : 'low',
  }));

  return {
    brief,
    role: topicNames[0] ?? 'Topic preparation',
    seniority: goalLevel,
    profession: topicNames[0] ?? 'Topic preparation',
    job_must_haves: topicNames.slice(0, 10),
    job_responsibilities: [],
    candidate_strengths: strengths.slice(0, 12),
    candidate_experience: strengths.slice(0, 8),
    candidate_gaps: gaps.slice(0, 6),
    competency_focus: competencyFocus,
    topic_names: topicNames,
    generated_at: new Date().toISOString(),
    source: 'topic',
    purpose: config.purpose,
    difficulty: config.difficulty,
    current_level: currentLevel,
    notes: config.notes,
    self_rated_skills: config.topics.map((t) => ({
      name: t.name,
      skill_level: t.skill_level,
    })),
  };
}

export function buildJobSeedContext(input: {
  jobTitle: string;
  companyName: string;
  jobSummary: string;
  keywords: string[];
  cvSummary: string;
}): MappedInterviewContext {
  const keywordLabels = input.keywords.slice(0, 8);
  const brief = [
    `${input.jobTitle} at ${input.companyName}.`,
    input.jobSummary.slice(0, 400),
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 600);

  const competencyFocus = keywordLabels.length
    ? keywordLabels.map((k, i) => ({
        id: `comp-${i + 1}`,
        name: k,
        importance: 'medium',
      }))
    : [{ id: 'comp-1', name: input.jobTitle, importance: 'high' }];

  return {
    brief,
    role: input.jobTitle,
    seniority: 'mid',
    profession: input.jobTitle,
    job_must_haves: keywordLabels.slice(0, 10),
    job_responsibilities: [],
    candidate_strengths: [],
    candidate_experience: [],
    candidate_gaps: [],
    competency_focus: competencyFocus,
    topic_names: [],
    generated_at: new Date().toISOString(),
    source: 'job',
  };
}

function blueprintForPurpose(purpose: TopicPrepPurpose): {
  objectives: string[];
  questionCategories: string[];
  mockQuestionTypes: string[];
} {
  if (purpose === 'learning') {
    return {
      objectives: ['Build foundational knowledge', 'Practice with progressive drills', 'Identify and fix gaps'],
      questionCategories: ['conceptual', 'how_it_works', 'practice_drill', 'common_mistakes'],
      mockQuestionTypes: ['conceptual', 'scenario'],
    };
  }
  if (purpose === 'work') {
    return {
      objectives: ['Apply skills in workplace scenarios', 'Navigate tradeoffs and constraints', 'Deliver practical outcomes'],
      questionCategories: ['workplace_scenario', 'tradeoff', 'implementation', 'stakeholder'],
      mockQuestionTypes: ['scenario', 'technical'],
    };
  }
  return {
    objectives: ['Practice likely interview questions', 'Structure strong responses', 'Meet evaluation criteria'],
    questionCategories: ['behavioral', 'technical', 'scenario', 'system_design'],
    mockQuestionTypes: ['behavioral', 'scenario'],
  };
}

export function seedBlueprintFromTopics(
  topics: SeedTopic[],
  difficulty = 'intermediate',
  purpose: TopicPrepPurpose = 'interview'
): InterviewBlueprint {
  const purposeConfig = blueprintForPurpose(purpose);

  return normalizeBlueprint({
    job_context: {},
    candidate_context: {},
    interview_strategy: {
      objectives: purposeConfig.objectives,
      evaluation_dimensions: [],
      question_categories: purposeConfig.questionCategories,
      question_count: 8,
      duration_minutes: 25,
      difficulty,
      adaptive: true,
    },
    preparation: {
      topics: topics.map((t) => ({
        name: t.name,
        priority: t.priority,
        estimated_minutes: 30,
      })),
      priority_order: topics.map((t) => t.name),
      learning_objectives: purposeConfig.objectives,
    },
    quiz: { question_types: ['single_choice', 'scenario'], difficulty },
    mock_interview: {
      question_types: purposeConfig.mockQuestionTypes,
      follow_up_strategy: {},
      evaluation_strategy: {},
    },
  });
}

export function competenciesFromTopicConfig(config: TopicPrepConfig): CompetencyItem[] {
  return config.topics.map((t, i) => ({
    id: `comp-${i + 1}`,
    name: t.name,
    category: 'topic',
    description: `Self-rated ${t.skill_level}/5 for ${t.name}`,
    importance: t.skill_level >= 4 ? 'high' : t.skill_level >= 3 ? 'medium' : 'low',
    priority: i + 1,
    evidence_from_job: t.name,
    evidence_from_candidate: `Self-rated ${t.skill_level}/5`,
    candidate_mastery: skillToMastery(t.skill_level),
  }));
}

export function competenciesFromSeedTopics(
  topics: SeedTopic[],
  jobTitle: string
): CompetencyItem[] {
  return topics.map((t, i) => ({
    id: `comp-${i + 1}`,
    name: t.name,
    category: 'topic',
    description: `Preparation focus: ${t.name}`,
    importance: t.priority <= 2 ? 'high' : 'medium',
    priority: t.priority,
    evidence_from_job: jobTitle,
    evidence_from_candidate: '',
    candidate_mastery: 50,
  }));
}

export function competencyNamesForAi(competencies: CompetencyItem[]): string {
  return JSON.stringify(
    competencies.map((c) => ({ id: c.id, name: c.name, importance: c.importance }))
  );
}
