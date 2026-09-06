import { parseClaudeJson } from '@/lib/parse-claude-json';
import {
  CLAUDE_MODEL,
  INTERVIEW_ANALYZER_MODEL,
  claudeComplete,
} from '@/lib/ai/anthropic-gateway';
import type { AiMetadata } from '@/types/interview';

export { INTERVIEW_ANALYZER_MODEL };

const PROMPT_OPERATION: Record<string, string> = {
  interview_clarify_v1: 'clarify',
  interview_job_v1: 'analysis_job',
  interview_candidate_v1: 'analysis_candidate',
  interview_competency_v1: 'competencies',
  interview_gap_v1: 'gaps',
  interview_blueprint_v1: 'blueprint',
  interview_prep_v1: 'planning',
  interview_prep_questions_v1: 'prep_questions',
  interview_prep_questions_v2: 'prep_questions',
  interview_prep_questions_v3: 'prep_questions',
  interview_prep_questions_v4: 'prep_questions',
  interview_prep_questions_v5: 'prep_questions',
  interview_topic_prep_questions_v2: 'prep_questions',
  interview_topic_prep_questions_v3: 'prep_questions',
  interview_topic_prep_questions_v4: 'prep_questions',
  interview_topic_prep_questions_v5: 'prep_questions',
  interview_topic_prep_questions_v6: 'prep_questions',
  interview_topic_analyze_v1: 'analysis_topic',
  interview_quiz_v1: 'quiz',
  interview_quiz_v2: 'quiz',
  interview_quiz_eval_v1: 'quiz_eval',
  interview_question_v1: 'mock_question',
  interview_eval_v1: 'mock_eval',
  interview_follow_up_v1: 'follow_up',
  interview_report_v1: 'report',
  interview_prep_question_explain_v1: 'prep_question_explain',
  interview_prep_question_explain_v2: 'prep_question_explain',
  interview_prep_question_example_v1: 'prep_question_example',
  interview_prep_question_reshape_v1: 'prep_question_reshape',
};

export async function runInterviewAi<T>(opts: {
  system: string;
  user: string;
  promptVersion: string;
  maxTokens?: number;
  model?: string;
  sourceJobHash?: string;
  sourceCvHash?: string;
  operation?: string;
  normalize: (raw: Record<string, unknown>) => T;
}): Promise<{ data: T; metadata: AiMetadata; inputTokens: number; outputTokens: number }> {
  const model = opts.model ?? CLAUDE_MODEL;
  const operation = opts.operation ?? PROMPT_OPERATION[opts.promptVersion] ?? 'unknown';
  let lastErr: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const userContent =
        attempt === 0
          ? opts.user
          : `${opts.user}\n\nYour previous response was invalid JSON or missing required fields. Return ONLY valid JSON matching the schema exactly.`;

      const { text, inputTokens, outputTokens } = await claudeComplete({
        system: opts.system,
        user: userContent,
        maxTokens: opts.maxTokens ?? 4096,
        model,
        category: 'interview_prep',
        operation,
        promptVersion: opts.promptVersion,
        maxRetries: 2,
        retryDelayMs: 15000,
      });

      if (!text.trim()) throw new Error('empty_model_response');

      const parsed = parseClaudeJson<Record<string, unknown>>(text);
      const data = opts.normalize(parsed);
      return {
        data,
        metadata: {
          model,
          prompt_version: opts.promptVersion,
          source_job_hash: opts.sourceJobHash,
          source_cv_hash: opts.sourceCvHash,
          generated_at: new Date().toISOString(),
        },
        inputTokens,
        outputTokens,
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('ai_generation_failed');
}
