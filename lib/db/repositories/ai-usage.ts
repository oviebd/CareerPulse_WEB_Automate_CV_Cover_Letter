import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { aiUsageEvents } from '@/lib/db/schema';
import { rowsToSnake, toSnake } from '@/lib/db/map-row';

export type AiUsageEventInsert = {
  user_id: string;
  category: string;
  operation: string;
  input_chars: number;
  output_chars: number;
  input_tokens: number;
  output_tokens: number;
  chars_per_token: number;
  model?: string | null;
  prompt_version?: string | null;
  related_id?: string | null;
  provider?: string | null;
  feature?: string | null;
  request_id?: string | null;
  credits_consumed?: number;
  credit_rule_version?: string | null;
  token_source?: string;
  metadata?: Record<string, unknown>;
};

async function insertEvent(event: AiUsageEventInsert) {
  const db = getDb();
  const [row] = await db
    .insert(aiUsageEvents)
    .values({
      userId: event.user_id,
      category: event.category,
      operation: event.operation,
      inputChars: event.input_chars,
      outputChars: event.output_chars,
      inputTokens: event.input_tokens,
      outputTokens: event.output_tokens,
      charsPerToken: event.chars_per_token,
      model: event.model ?? null,
      promptVersion: event.prompt_version ?? null,
      relatedId: event.related_id ?? null,
      provider: event.provider ?? 'anthropic',
      feature: event.feature ?? null,
      requestId: event.request_id ?? null,
      creditsConsumed: event.credits_consumed ?? 0,
      creditRuleVersion: event.credit_rule_version ?? null,
      tokenSource: event.token_source ?? 'api',
      metadata: event.metadata ?? {},
    })
    .returning();
  return row ? toSnake(row) : null;
}

async function listRecent(userId: string, limit = 50) {
  const db = getDb();
  const rows = await db
    .select()
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.userId, userId))
    .orderBy(desc(aiUsageEvents.createdAt))
    .limit(limit);
  return rowsToSnake(rows);
}

async function aggregateByCategory(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      category: aiUsageEvents.category,
      operation: aiUsageEvents.operation,
      input_tokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)`.mapWith(Number),
      output_tokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)`.mapWith(Number),
      input_chars: sql<number>`coalesce(sum(${aiUsageEvents.inputChars}), 0)`.mapWith(Number),
      output_chars: sql<number>`coalesce(sum(${aiUsageEvents.outputChars}), 0)`.mapWith(Number),
      event_count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.userId, userId))
    .groupBy(aiUsageEvents.category, aiUsageEvents.operation)
    .orderBy(aiUsageEvents.category, aiUsageEvents.operation);
  return rows;
}

async function aggregateTotals(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      input_tokens: sql<number>`coalesce(sum(${aiUsageEvents.inputTokens}), 0)`.mapWith(Number),
      output_tokens: sql<number>`coalesce(sum(${aiUsageEvents.outputTokens}), 0)`.mapWith(Number),
      input_chars: sql<number>`coalesce(sum(${aiUsageEvents.inputChars}), 0)`.mapWith(Number),
      output_chars: sql<number>`coalesce(sum(${aiUsageEvents.outputChars}), 0)`.mapWith(Number),
      event_count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(aiUsageEvents)
    .where(eq(aiUsageEvents.userId, userId));
  return row ?? {
    input_tokens: 0,
    output_tokens: 0,
    input_chars: 0,
    output_chars: 0,
    event_count: 0,
  };
}

export function getAiUsageRepo() {
  return { insertEvent, listRecent, aggregateByCategory, aggregateTotals };
}
