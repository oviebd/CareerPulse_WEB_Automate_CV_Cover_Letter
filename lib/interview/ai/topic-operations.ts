import { runInterviewAi, INTERVIEW_ANALYZER_MODEL } from '@/lib/interview/ai/runner';
import {
  normalizeTopicPipelineOutput,
  normalizeTopicPrepQuestionBatch,
} from '@/lib/interview/validators';
import { topicConfigPrompt } from '@/lib/interview/topic-config';
import type { TopicPrepConfig, TopicPrepPurpose } from '@/types/interview';

export const TOPIC_PROMPT_V = {
  ANALYZE: 'interview_topic_analyze_v1',
  PREP_QUESTIONS: 'interview_topic_prep_questions_v6',
} as const;

const TOPIC_BASE_RULES = `You are an expert coach. Build preparation from the user's topic, current expertise, goal expertise, purpose, and optional note.
Do NOT reference or assume a CV, resume, or prior employment history.
Return ONLY valid JSON. No markdown fences around the JSON itself.`;

const TOPIC_PREP_MARKDOWN_RULE = `Format answer_text and key_points as Markdown (not HTML): start with a brief opening line, then use 3–6 bullet points (- item) when helpful, **bold** for emphasis, inline \`code\`, and a brief fenced \`\`\`language block only if the question requires it. Do not write guidelines, headings, or study tips in answer_text.`;

const TOPIC_ANSWER_LENGTH_RULE = `Aim for 800–1000 characters. Never exceed 1500 characters.`;

function purposeGuide(purpose: TopicPrepPurpose): string {
  if (purpose === 'learning') {
    return 'Focus on teaching, explanations, progressive skill building, and practice drills.';
  }
  if (purpose === 'work') {
    return 'Focus on applying the topic in real workplace situations, tradeoffs, and delivering practical outcomes.';
  }
  return 'Focus on realistic interview questions and evaluation criteria.';
}

function purposeStyleGuide(purpose: TopicPrepPurpose): string {
  if (purpose === 'learning') {
    return `answer_text is the teaching ANSWER itself (the explanation or worked result), not a study guideline.
${TOPIC_ANSWER_LENGTH_RULE} Use relevance "supported" always. Put extra teaching points in key_points.
Prefer conceptual, how-it-works, practice drill, and common-mistake question types.`;
  }
  if (purpose === 'work') {
    return `answer_text is a concise practical ANSWER (what to do, the tradeoff, and the outcome), not a how-to guideline.
${TOPIC_ANSWER_LENGTH_RULE} Use relevance "supported" always. Put extra practical points in key_points.
Prefer workplace scenarios, implementation tradeoffs, and stakeholder/constraint questions.`;
  }
  return `answer_text is a complete sample interview ANSWER at the target level, not structure tips or STAR coaching.
${TOPIC_ANSWER_LENGTH_RULE} Use relevance "supported" always. Put extra points in key_points.
Prefer behavioral, technical, and scenario interview question types.`;
}

function purposePrepLabel(purpose: TopicPrepPurpose): string {
  if (purpose === 'learning') return 'learning';
  if (purpose === 'work') return 'workplace application';
  return 'interview';
}

export async function analyzeTopicConfig(
  config: TopicPrepConfig,
  configHash: string
) {
  return runInterviewAi({
    system: TOPIC_BASE_RULES,
    user: `Analyze this topic-based preparation request and return a complete preparation profile.

Return JSON only:
{
  "analysis": {
    "profession": "",
    "occupation": "",
    "role": "",
    "domain": "",
    "seniority": "",
    "focus_areas": [],
    "learning_objectives": [],
    "likely_question_types": [],
    "evaluation_dimensions": [],
    "candidate_strengths": [],
    "candidate_gaps": [],
    "summary": ""
  },
  "competencies": [{
    "id": "comp-1",
    "name": "",
    "category": "",
    "description": "",
    "importance": "high|medium|low|critical",
    "priority": 1,
    "evidence_from_job": "",
    "evidence_from_candidate": "",
    "candidate_mastery": 50
  }],
  "blueprint": {
    "job_context": {},
    "candidate_context": {},
    "interview_strategy": {
      "objectives": [],
      "evaluation_dimensions": [],
      "question_categories": [],
      "question_count": 8,
      "duration_minutes": 25,
      "difficulty": "",
      "adaptive": true
    },
    "preparation": {
      "topics": [{"name": "", "priority": 1, "estimated_minutes": 30}],
      "priority_order": [],
      "learning_objectives": []
    },
    "quiz": {"question_types": ["single_choice", "scenario"], "difficulty": ""},
    "mock_interview": {
      "question_types": [],
      "follow_up_strategy": {},
      "evaluation_strategy": {}
    }
  }
}

Rules:
- Infer profession and domain from topic — do NOT assume software engineering unless the topic indicates it.
- candidate_strengths and candidate_gaps must reflect current expertise only.
- competencies: map to the selected topic; candidate_mastery should reflect current skill (20-100 scale).
- blueprint difficulty should match the goal expertise level.
- Progress from current expertise toward the goal level in learning objectives and question difficulty.
- ${purposeGuide(config.purpose)}
${config.notes?.trim() ? `- Follow the user's note when shaping focus areas and question types: ${config.notes.trim()}` : ''}

TOPIC CONFIG:
${topicConfigPrompt(config)}`,
    promptVersion: TOPIC_PROMPT_V.ANALYZE,
    model: INTERVIEW_ANALYZER_MODEL,
    sourceJobHash: configHash,
    normalize: normalizeTopicPipelineOutput,
  });
}

export async function generateTopicPrepQuestionBatch(
  ctx: {
    mappedContext: string;
    purpose: TopicPrepPurpose;
    difficulty: string;
    currentLevel: string;
    goalLevel: string;
    notes?: string;
    existingQuestions: string[];
    count: number;
    topicNames: string[];
    focusTopic?: string | null;
  },
  configHash: string
) {
  const exclude =
    ctx.existingQuestions.length > 0
      ? `\nALREADY GENERATED (do NOT repeat or rephrase these):\n${ctx.existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const styleGuide = purposeStyleGuide(ctx.purpose);
  const noteRule = ctx.notes?.trim()
    ? `\nUSER NOTE (follow when designing questions): ${ctx.notes.trim()}`
    : '';

  const topicList = ctx.topicNames.join(', ');
  const scopeRule = ctx.focusTopic
    ? `- ALL questions must be about this topic only: ${ctx.focusTopic}. Set topic_name to exactly "${ctx.focusTopic}".`
    : `- Cover these topics: ${topicList}. Each question MUST include topic_name matching one of those labels.`;

  return runInterviewAi({
    system: TOPIC_BASE_RULES,
    user: `Generate exactly ${ctx.count} preparation questions for topic-based ${purposePrepLabel(ctx.purpose)} prep.
Return JSON:
{"questions":[{"question":"","type":"","competency_id":"","difficulty":"","answer_text":"","relevance":"supported","key_points":"","why_selected":"","topic_name":""}]}

Rules:
- Questions must bridge from current expertise toward the goal level on the selected topic.
- Calibrate difficulty between current and goal levels; avoid questions far below current or far above goal.
- Do NOT reference a CV or invent personal work history.
- Do NOT write a coaching guideline or a separate sample. answer_text is the only answer.
- ${styleGuide}
- ${TOPIC_PREP_MARKDOWN_RULE}
- Vary question types as appropriate for the purpose and topics.
${scopeRule}
${noteRule}
${exclude}

CURRENT LEVEL: ${ctx.currentLevel}
GOAL LEVEL: ${ctx.goalLevel}
PURPOSE: ${ctx.purpose}
DIFFICULTY: ${ctx.difficulty}
FOCUS TOPIC: ${ctx.focusTopic ?? 'any of the listed topics'}
AVAILABLE TOPICS: ${topicList}

MAPPED CONTEXT:
${ctx.mappedContext}`,
    promptVersion: TOPIC_PROMPT_V.PREP_QUESTIONS,
    maxTokens: 8192,
    sourceJobHash: configHash,
    normalize: normalizeTopicPrepQuestionBatch,
  });
}
