/** Topic-based interview prep configuration and display helpers. */

import type {
  InterviewBlueprint,
  InterviewProfile,
  TopicExpertiseLevel,
  TopicPrepConfig,
  TopicPrepPurpose,
} from '@/types/interview';

export const SUGGESTED_TOPIC_CHIPS = [
  'Behavioral',
  'System design',
  'SQL',
  'Leadership',
  'Domain knowledge',
  'Communication',
  'Problem solving',
  'Technical fundamentals',
  'Product sense',
  'Data structures',
] as const;

export const TOPIC_EXPERTISE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
] as const;

/** @deprecated Legacy goal levels for old profiles */
export const TOPIC_GOAL_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid' },
  { value: 'senior', label: 'Senior' },
  { value: 'staff', label: 'Staff / Lead' },
  { value: 'principal', label: 'Principal' },
] as const;

export const TOPIC_PURPOSES = [
  { value: 'learning', label: 'Learn', description: 'Build knowledge with explanations and practice' },
  { value: 'interview', label: 'Interview', description: 'Prepare for realistic interview questions' },
  { value: 'work', label: 'Work', description: 'Apply the topic in real job situations' },
] as const;

const MAX_NOTE_LENGTH = 200;

export const TOPIC_DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export const TOPIC_SKILL_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

const MAX_TOPICS = 8;
const DEFAULT_POSITION = 'General professional';

export function normalizeTopicName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isTopicExpertiseLevel(value: string): value is TopicExpertiseLevel {
  return value === 'beginner' || value === 'intermediate' || value === 'expert';
}

export function isTopicPurpose(value: string): value is TopicPrepPurpose {
  return value === 'learning' || value === 'interview' || value === 'work';
}

export function purposeLabel(purpose: TopicPrepPurpose): string {
  return TOPIC_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose;
}

export function expertiseToSkillLevel(level: TopicExpertiseLevel): 1 | 3 | 5 {
  if (level === 'beginner') return 1;
  if (level === 'expert') return 5;
  return 3;
}

export function skillLevelToExpertise(skill: number): TopicExpertiseLevel {
  if (skill <= 2) return 'beginner';
  if (skill >= 4) return 'expert';
  return 'intermediate';
}

export function goalExpertiseToDifficulty(goal: TopicExpertiseLevel): TopicPrepConfig['difficulty'] {
  if (goal === 'beginner') return 'beginner';
  if (goal === 'expert') return 'advanced';
  return 'intermediate';
}

export function expertiseLabel(level: string): string {
  return TOPIC_EXPERTISE_LEVELS.find((l) => l.value === level)?.label ?? level;
}

export function parseTopicPrepConfig(raw: unknown): TopicPrepConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const purposeRaw = typeof o.purpose === 'string' ? o.purpose : '';
  const purpose = isTopicPurpose(purposeRaw) ? purposeRaw : null;
  const difficulty =
    o.difficulty === 'beginner' || o.difficulty === 'intermediate' || o.difficulty === 'advanced'
      ? o.difficulty
      : null;
  const goalRole = typeof o.goal_role === 'string' ? o.goal_role.trim() : '';
  const goalLevel = typeof o.goal_level === 'string' ? o.goal_level.trim() : '';
  const currentLevelRaw = typeof o.current_level === 'string' ? o.current_level.trim() : '';
  const currentLevel = isTopicExpertiseLevel(currentLevelRaw) ? currentLevelRaw : undefined;
  const notes = typeof o.notes === 'string' ? o.notes.trim() : undefined;
  const topicsRaw = Array.isArray(o.topics) ? o.topics : [];

  const topics = topicsRaw
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const item = t as Record<string, unknown>;
      const name = typeof item.name === 'string' ? normalizeTopicName(item.name) : '';
      const skill = typeof item.skill_level === 'number' ? item.skill_level : Number(item.skill_level);
      if (!name || skill < 1 || skill > 5) return null;
      return { name, skill_level: Math.round(skill) as 1 | 2 | 3 | 4 | 5 };
    })
    .filter((t): t is TopicPrepConfig['topics'][number] => t !== null)
    .slice(0, MAX_TOPICS);

  if (!purpose || !difficulty || !goalLevel || topics.length === 0) return null;

  const resolvedCurrent =
    currentLevel ??
    (topics.length === 1 ? skillLevelToExpertise(topics[0].skill_level) : undefined);

  return {
    purpose,
    difficulty,
    goal_role: goalRole || DEFAULT_POSITION,
    goal_level: goalLevel,
    current_level: resolvedCurrent,
    notes: notes || undefined,
    topics,
  };
}

export function buildTopicPrepConfig(input: {
  topic: string;
  current_level: string;
  goal_level: string;
  purpose: string;
  notes?: string;
}): { ok: true; config: TopicPrepConfig } | { ok: false; message: string } {
  const topic = normalizeTopicName(input.topic);
  if (!topic) {
    return { ok: false, message: 'Enter a topic to prepare for.' };
  }
  if (!isTopicExpertiseLevel(input.current_level)) {
    return { ok: false, message: 'Select your current expertise level.' };
  }
  if (!isTopicExpertiseLevel(input.goal_level)) {
    return { ok: false, message: 'Select your goal expertise level.' };
  }
  if (!isTopicPurpose(input.purpose)) {
    return { ok: false, message: 'Select your purpose.' };
  }

  const notesRaw = typeof input.notes === 'string' ? input.notes.trim() : '';
  if (notesRaw.length > MAX_NOTE_LENGTH) {
    return { ok: false, message: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
  }

  const config: TopicPrepConfig = {
    purpose: input.purpose,
    difficulty: goalExpertiseToDifficulty(input.goal_level),
    goal_role: DEFAULT_POSITION,
    goal_level: input.goal_level,
    current_level: input.current_level,
    notes: notesRaw || undefined,
    topics: [{ name: topic, skill_level: expertiseToSkillLevel(input.current_level) }],
  };

  return { ok: true, config };
}

/** @deprecated Use buildTopicPrepConfig for new simplified form */
export function validateTopicPrepInput(input: {
  purpose: string;
  difficulty: string;
  goal_role: string;
  goal_level: string;
  notes?: string;
  topics: Array<{ name: string; skill_level: number }>;
}): { ok: true; config: TopicPrepConfig } | { ok: false; message: string } {
  const config = parseTopicPrepConfig({
    purpose: input.purpose,
    difficulty: input.difficulty,
    goal_role: input.goal_role,
    goal_level: input.goal_level,
    notes: input.notes,
    topics: input.topics,
  });
  if (!config) {
    return {
      ok: false,
      message: 'Select at least one topic, a goal role and level, purpose, and difficulty.',
    };
  }
  if (config.topics.length > MAX_TOPICS) {
    return { ok: false, message: `Maximum ${MAX_TOPICS} topics allowed.` };
  }
  return { ok: true, config };
}

export function isTopicPrepProfile(profile: Pick<InterviewProfile, 'prep_source' | 'job_id'>): boolean {
  return profile.prep_source === 'topic' || profile.job_id == null;
}

export function getTopicPrepDisplayTitle(config: TopicPrepConfig | null | undefined): string {
  if (!config?.topics?.length) return 'Topic preparation';
  const names = config.topics.map((t) => t.name);
  if (names.length <= 2) return names.join(' · ');
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} more`;
}

export function getTopicPrepDisplaySubtitle(config: TopicPrepConfig | null | undefined): string {
  if (!config) return 'Topic-based prep';

  const current = config.current_level
    ? expertiseLabel(config.current_level)
    : config.topics.length === 1
      ? expertiseLabel(skillLevelToExpertise(config.topics[0].skill_level))
      : null;

  const goal = isTopicExpertiseLevel(config.goal_level)
    ? expertiseLabel(config.goal_level)
    : TOPIC_GOAL_LEVELS.find((l) => l.value === config.goal_level)?.label ?? config.goal_level;

  const parts: string[] = [];
  if (current && goal) {
    parts.push(`${current} → ${goal}`);
  } else if (goal) {
    parts.push(`Goal: ${goal}`);
  }

  parts.push(purposeLabel(config.purpose));

  return parts.join(' · ');
}

export function enrichProfileDisplay(
  profile: InterviewProfile
): InterviewProfile & { job_title?: string; company_name?: string } {
  if (!isTopicPrepProfile(profile)) return profile;
  const config = parseTopicPrepConfig(profile.topic_config_json);
  return {
    ...profile,
    job_title: getTopicPrepDisplayTitle(config),
    company_name: getTopicPrepDisplaySubtitle(config),
  };
}

export function topicConfigPrompt(config: TopicPrepConfig): string {
  const current =
    config.current_level ??
    (config.topics.length === 1 ? skillLevelToExpertise(config.topics[0].skill_level) : 'unknown');

  return JSON.stringify(
    {
      purpose: config.purpose,
      difficulty: config.difficulty,
      current_level: current,
      goal_level: config.goal_level,
      notes: config.notes ?? '',
      topics: config.topics.map((t) => ({
        name: t.name,
        self_rated_skill: t.skill_level,
        skill_label: TOPIC_SKILL_LABELS[t.skill_level],
      })),
    },
    null,
    0
  );
}

export function hashTopicConfig(config: TopicPrepConfig): string {
  const normalized = JSON.stringify({
    purpose: config.purpose,
    difficulty: config.difficulty,
    current_level: config.current_level ?? '',
    goal_level: config.goal_level.toLowerCase(),
    notes: (config.notes ?? '').toLowerCase(),
    topics: config.topics
      .map((t) => ({ name: t.name.toLowerCase(), skill_level: t.skill_level }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `topic_${Math.abs(hash).toString(36)}`;
}

export function seedPreparationTopicsFromProfile(profile: {
  prep_source?: unknown;
  topic_config_json?: unknown;
  blueprint_json?: unknown;
}): Array<{ name: string; priority: number }> | null {
  if (profile.prep_source !== 'topic') return null;
  const config = parseTopicPrepConfig(profile.topic_config_json);
  if (config?.topics.length) {
    return config.topics.map((t, i) => ({ name: t.name, priority: i + 1 }));
  }
  const blueprint = profile.blueprint_json as InterviewBlueprint | null;
  const fromBlueprint = blueprint?.preparation?.topics;
  if (fromBlueprint?.length) {
    return fromBlueprint
      .filter((t) => typeof t.name === 'string' && t.name.trim())
      .map((t, i) => ({ name: t.name.trim(), priority: t.priority ?? i + 1 }));
  }
  return null;
}
