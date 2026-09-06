import { getInterviewRepo } from '@/lib/db/repositories/interview';
import { generateTopicPrepQuestionBatch } from '@/lib/interview/ai/topic-operations';
import { runPreparePipeline } from '@/lib/interview/orchestrator';
import {
  buildTopicPrepConfig,
  hashTopicConfig,
  parseTopicPrepConfig,
} from '@/lib/interview/topic-config';
import { InterviewError } from '@/lib/interview/errors';
import {
  buildTopicSeedContext,
  competenciesFromTopicConfig,
  seedBlueprintFromTopics,
} from '@/lib/interview/seed-profile';
import type { TopicPrepConfig } from '@/types/interview';

async function seedTopicProfile(userId: string, profileId: string, config: TopicPrepConfig) {
  const repo = getInterviewRepo();
  const configHash = hashTopicConfig(config);
  const competencies = competenciesFromTopicConfig(config);
  const mappedContext = buildTopicSeedContext(config);
  const topicSeeds = config.topics.map((t, i) => ({ name: t.name, priority: i + 1 }));
  const blueprint = seedBlueprintFromTopics(topicSeeds, config.difficulty, config.purpose);

  await repo.deleteCompetenciesForProfile(profileId);
  await repo.insertCompetencies(
    profileId,
    competencies.map((c) => ({
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

  const topicTitle = config.topics.map((t) => t.name).join(', ') || 'Topic preparation';

  const profile = await repo.updateProfile(userId, profileId, {
    status: 'ready',
    prep_source: 'topic',
    topic_config_json: config,
    source_job_hash: configHash,
    source_cv_hash: null,
    cv_id: null,
    job_id: null,
    role: topicTitle,
    seniority: config.goal_level,
    profession: topicTitle,
    candidate_summary: mappedContext.brief,
    job_summary: `Topic prep: ${config.topics.map((t) => t.name).join(', ')}`,
    mapped_context_json: mappedContext,
    blueprint_json: blueprint,
    gap_json: [],
    readiness_score: 0,
    clarification_json: { needs_clarification: false, questions: [] },
  });

  const prepared = await runPreparePipeline(userId, profileId);
  return {
    profile,
    status: 'ready' as const,
    plan: prepared.plan,
    topics: prepared.topics,
    prep_questions: prepared.prep_questions,
  };
}

export async function runTopicFastStart(userId: string, profileId: string, config: TopicPrepConfig) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile) throw new Error('Profile not found');

  try {
    return await seedTopicProfile(userId, profileId, config);
  } catch (e) {
    await repo.updateProfile(userId, profileId, { status: 'failed' });
    throw e;
  }
}

export async function startInterviewFromTopic(
  userId: string,
  input: {
    topic: string;
    current_level: string;
    goal_level: string;
    purpose: string;
    notes?: string;
  }
) {
  const validated = buildTopicPrepConfig(input);
  if (!validated.ok) {
    throw new InterviewError('TOPIC_CONFIG_INVALID', validated.message);
  }
  const config = validated.config;
  const configHash = hashTopicConfig(config);
  const repo = getInterviewRepo();

  const profile = await repo.insertProfile(userId, {
    job_id: null,
    cv_id: null,
    prep_source: 'topic',
    topic_config_json: config,
    status: 'ready',
    source_job_hash: configHash,
    source_cv_hash: null,
    extra_context: null,
  });

  const result = await runTopicFastStart(userId, profile.id as string, config);
  return { ...result, profile_id: profile.id as string };
}

export async function retryTopicInterview(userId: string, profileId: string) {
  const repo = getInterviewRepo();
  const profile = await repo.getProfileById(userId, profileId);
  if (!profile || profile.prep_source !== 'topic') {
    throw new InterviewError('PROFILE_NOT_FOUND', 'Topic profile not found.');
  }
  const config = parseTopicPrepConfig(profile.topic_config_json);
  if (!config) {
    throw new InterviewError('TOPIC_CONFIG_INVALID', 'Topic configuration is missing or invalid.');
  }
  return runTopicFastStart(userId, profileId, config);
}

export { generateTopicPrepQuestionBatch };
