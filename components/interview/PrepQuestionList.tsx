'use client';

import { useMemo } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AiWorkingOverlay } from '@/components/shared/AiWorkingOverlay';
import { PrepQuestionCard } from '@/components/interview/PrepQuestionCard';
import { fadeUp, staggerChildren } from '@/lib/animations';
import {
  usePrepQuestions,
  useGeneratePrepQuestions,
  useUpdatePrepQuestionAnswer,
} from '@/hooks/useInterview';
import { PREP_TOPIC_ALL, topicIdForApi } from '@/lib/interview/prep-topic-query';
import type { PrepQuestion } from '@/types/interview';

type TopicRow = { id: string; name: string; priority?: number | null };

type Props = {
  profileId: string;
  profileReady: boolean;
  profileStatus?: string;
  topics: TopicRow[];
  topicFilter: string;
};

function mapQuestion(row: Record<string, unknown>): PrepQuestion {
  return {
    id: row.id as string,
    interview_profile_id: row.interview_profile_id as string,
    topic_id: (row.topic_id as string | null) ?? null,
    topic_name: (row.topic_name as string | null) ?? null,
    batch_number: row.batch_number as number,
    sequence: row.sequence as number,
    question_type: row.question_type as string,
    question_text: row.question_text as string,
    competency_id: (row.competency_id as string | null) ?? null,
    difficulty: (row.difficulty as string | null) ?? null,
    answer_text: row.answer_text as string,
    answer_source: (row.answer_source as PrepQuestion['answer_source']) ?? 'ai',
    relevance: (row.relevance as PrepQuestion['relevance']) ?? 'supported',
    evidence_from_cv: (row.evidence_from_cv as string | null) ?? null,
    why_selected: (row.why_selected as string | null) ?? null,
    example_answer: (row.example_answer as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function sortQuestions(questions: PrepQuestion[], topics: TopicRow[], filter: string) {
  const filtered =
    filter === PREP_TOPIC_ALL ? questions : questions.filter((q) => q.topic_id === filter);
  const order = new Map(topics.map((t, i) => [t.id, i]));
  return [...filtered].sort((a, b) => {
    if (filter === PREP_TOPIC_ALL) {
      const ao = a.topic_id ? (order.get(a.topic_id) ?? 999) : 1000;
      const bo = b.topic_id ? (order.get(b.topic_id) ?? 999) : 1000;
      if (ao !== bo) return ao - bo;
    }
    return a.sequence - b.sequence;
  });
}

function groupByTopic(questions: PrepQuestion[], topics: TopicRow[]) {
  const byId = new Map(topics.map((t) => [t.id, t.name]));
  const groups: Array<{ key: string; name: string; questions: PrepQuestion[] }> = [];
  for (const q of questions) {
    const key = q.topic_id ?? '__none__';
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.questions.push(q);
      continue;
    }
    groups.push({
      key,
      name: q.topic_id ? (q.topic_name ?? byId.get(q.topic_id) ?? 'Topic') : 'Untagged',
      questions: [q],
    });
  }
  return groups;
}

export function PrepQuestionList({
  profileId,
  profileReady,
  profileStatus,
  topics,
  topicFilter,
}: Props) {
  const reduce = useReducedMotion();
  const { data, isLoading } = usePrepQuestions(profileId);
  const generate = useGeneratePrepQuestions(profileId);
  const updateAnswer = useUpdatePrepQuestionAnswer(profileId);

  const selectedTopic = topics.find((t) => t.id === topicFilter);
  const allQuestions = useMemo(
    () => (data?.questions ?? []).map(mapQuestion),
    [data?.questions]
  );
  const questions = useMemo(
    () => sortQuestions(allQuestions, topics, topicFilter),
    [allQuestions, topics, topicFilter]
  );
  const groups = useMemo(
    () =>
      topicFilter === PREP_TOPIC_ALL ? groupByTopic(questions, topics) : [{ key: topicFilter, name: '', questions }],
    [questions, topics, topicFilter]
  );

  async function handleLoad() {
    await generate.mutateAsync({ topic_id: topicIdForApi(topicFilter) ?? null });
  }

  async function handleSaveAnswer(questionId: string, answerText: string) {
    await updateAnswer.mutateAsync({ questionId, answer_text: answerText });
  }

  const loadLabel = selectedTopic ? `Load questions for ${selectedTopic.name}` : 'Load questions';
  const emptyHint = selectedTopic
    ? `No questions for ${selectedTopic.name} yet. Generate a batch focused on this topic.`
    : 'Generate likely questions across any topic. Each question will be tagged to a topic.';

  if (!profileReady) {
    return (
      <Card className="space-y-3 py-6 text-center text-sm">
        {profileStatus === 'analyzing' ? (
          <p className="text-[var(--color-muted)]">
            Interview analysis in progress… Likely questions will be available when your profile is
            ready.
          </p>
        ) : (
          <p className="text-[var(--color-muted)]">
            Complete interview analysis before loading likely questions.
          </p>
        )}
      </Card>
    );
  }

  if (topics.length === 0) {
    return (
      <Card className="space-y-3 py-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Generate preparation topics first, then load likely questions topic by topic.
        </p>
      </Card>
    );
  }

  return (
    <div id="likely-questions" className="space-y-4 scroll-mt-6">
      <AiWorkingOverlay
        open={generate.isPending && questions.length === 0}
        title="Writing practice questions"
        messages={[
          selectedTopic
            ? `AI is working on ${selectedTopic.name}…`
            : 'Drafting questions across your topics…',
          'Writing rich answers with bullet points…',
          'Almost ready…',
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Likely interview questions
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {selectedTopic
              ? `Questions for ${selectedTopic.name}, with rich answers you can review and reshape.`
              : 'Personalized questions grouped by topic. Reveal, review, and reshape the answers.'}
          </p>
        </div>
        {questions.length > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            loading={generate.isPending}
            icon={<MessageSquarePlus className="h-4 w-4" />}
            onClick={() => void handleLoad()}
          >
            Load more
          </Button>
        ) : null}
      </div>

      {generate.isPending && questions.length > 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="space-y-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-mint)]/15 text-[var(--color-accent-mint)]">
            <MessageSquarePlus className="h-6 w-6" />
          </div>
          <p className="text-sm text-[var(--color-muted)]">{emptyHint}</p>
          <Button
            variant="primary"
            loading={generate.isPending}
            icon={<MessageSquarePlus className="h-4 w-4" />}
            onClick={() => void handleLoad()}
          >
            {loadLabel}
          </Button>
        </Card>
      ) : (
        <motion.div
          className="space-y-6"
          initial={reduce ? false : 'initial'}
          animate={reduce ? false : 'animate'}
          variants={reduce ? undefined : staggerChildren}
        >
          {groups.map((group) => (
            <div key={group.key} className="space-y-3">
              {group.name ? (
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  {group.name}
                </h4>
              ) : null}
              {group.questions.map((q, i) => {
                const index =
                  topicFilter === PREP_TOPIC_ALL
                    ? questions.indexOf(q) + 1
                    : i + 1;
                return (
                <motion.div
                  key={q.id}
                  variants={reduce ? undefined : { initial: fadeUp.initial, animate: fadeUp.animate }}
                >
                  <PrepQuestionCard
                    question={q}
                    index={index}
                    showTopic={topicFilter === PREP_TOPIC_ALL}
                    saving={updateAnswer.isPending}
                    onSaveAnswer={handleSaveAnswer}
                  />
                </motion.div>
                );
              })}
            </div>
          ))}
          <div className="flex justify-center pt-2">
            <Button
              variant="secondary"
              loading={generate.isPending}
              icon={<MessageSquarePlus className="h-4 w-4" />}
              onClick={() => void handleLoad()}
            >
              Load more
            </Button>
          </div>
        </motion.div>
      )}

      {generate.isError ? (
        <p className="text-sm text-[var(--color-danger)]">
          Could not generate questions. Your existing questions are saved — try again.
        </p>
      ) : null}
    </div>
  );
}
