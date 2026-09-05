'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MessageSquarePlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrepQuestionCard } from '@/components/interview/PrepQuestionCard';
import {
  usePrepQuestions,
  useGeneratePrepQuestions,
  useUpdatePrepQuestionAnswer,
} from '@/hooks/useInterview';
import type { PrepQuestion } from '@/types/interview';

type Props = {
  profileId: string;
  profileReady: boolean;
  profileStatus?: string;
};

function mapQuestion(row: Record<string, unknown>): PrepQuestion {
  return {
    id: row.id as string,
    interview_profile_id: row.interview_profile_id as string,
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
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function PrepQuestionList({ profileId, profileReady, profileStatus }: Props) {
  const { data, isLoading } = usePrepQuestions(profileId);
  const generate = useGeneratePrepQuestions(profileId);
  const updateAnswer = useUpdatePrepQuestionAnswer(profileId);

  const questions = useMemo(
    () => (data?.questions ?? []).map(mapQuestion),
    [data?.questions]
  );

  async function handleLoad() {
    await generate.mutateAsync();
  }

  async function handleSaveAnswer(questionId: string, answerText: string) {
    await updateAnswer.mutateAsync({ questionId, answer_text: answerText });
  }

  if (!profileReady) {
    return (
      <div id="likely-questions" className="scroll-mt-6">
        <Card className="space-y-3 py-6 text-center text-sm">
          {profileStatus === 'needs_clarification' ? (
            <>
              <p className="text-[var(--color-text-secondary)]">
                Answer the clarification questions on your interview dashboard first. Analysis must
                finish before likely questions can be generated.
              </p>
              <Link href={`/interview/${profileId}`}>
                <Button size="sm" variant="primary">
                  Go to interview dashboard
                </Button>
              </Link>
            </>
          ) : profileStatus === 'analyzing' ? (
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
      </div>
    );
  }

  return (
    <div id="likely-questions" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Likely interview questions
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Personalized questions with CV-grounded suggested answers. Reveal, review, and edit as
            needed.
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

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : questions.length === 0 ? (
        <Card className="space-y-4 py-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            Your first 5 likely questions are generated during preparation. If none appear yet,
            load a batch below.
          </p>
          <Button
            variant="primary"
            loading={generate.isPending}
            icon={<MessageSquarePlus className="h-4 w-4" />}
            onClick={() => void handleLoad()}
          >
            Load questions
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <PrepQuestionCard
              key={q.id}
              question={q}
              index={i + 1}
              saving={updateAnswer.isPending}
              onSaveAnswer={handleSaveAnswer}
            />
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
        </div>
      )}

      {generate.isError ? (
        <p className="text-sm text-[var(--color-danger)]">
          Could not generate questions. Your existing questions are saved — try again.
        </p>
      ) : null}
    </div>
  );
}
