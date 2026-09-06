'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api-fetch';
import type {
  InterviewDashboard,
  InterviewProfile,
  ReadinessBreakdown,
} from '@/types/interview';

export type StartInterviewBody =
  | {
      job_id: string;
      cv_id?: string;
      extra_context?: string;
      job_description?: string;
      interview_date?: string;
      interview_stage?: string;
    }
  | {
      job_title: string;
      company_name: string;
      job_description: string;
      cv_id: string;
      job_url?: string;
      interview_date?: string;
      interview_stage?: string;
      extra_context?: string;
    }
  | {
      source: 'topic';
      topic: string;
      current_level: string;
      goal_level: string;
      purpose: string;
      notes?: string;
    };

export function useInterviewDashboard() {
  return useQuery({
    queryKey: ['interview-profiles'],
    queryFn: () => apiFetch<InterviewDashboard>('/api/interview/profiles'),
    staleTime: 30_000,
  });
}

export function useInterviewProfiles() {
  const q = useInterviewDashboard();
  return {
    ...q,
    data: q.data?.profiles ?? [],
  };
}

export type ProfileDashboardData = {
  profile: InterviewProfile;
  competencies: Record<string, unknown>[];
  mastery: Record<string, unknown>[];
  plan: Record<string, unknown> | null;
  topics: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  quiz_attempts: Record<string, unknown>[];
  in_progress_quiz: Record<string, unknown> | null;
  readiness: ReadinessBreakdown;
};

export function useInterviewProfile(profileId: string) {
  return useQuery({
    queryKey: ['interview-profile', profileId],
    queryFn: () => apiFetch<ProfileDashboardData>(`/api/interview/profiles/${profileId}`),
    enabled: Boolean(profileId),
    staleTime: 15_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && (error.status === 404 || error.status >= 500)) {
        return failureCount < 8;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchInterval: (query) => {
      const status = query.state.data?.profile?.status;
      return status === 'analyzing' ? 3000 : false;
    },
  });
}

export function useStartInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartInterviewBody) =>
      apiFetch<{
        profile: InterviewProfile;
        status: string;
        job_id?: string;
        plan?: Record<string, unknown> | null;
        topics?: Record<string, unknown>[];
        plan_error?: boolean;
      }>('/api/interview/start', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, body) => {
      void qc.invalidateQueries({ queryKey: ['interview-profiles'] });
      if ('job_id' in body || ('source' in body && body.source === 'topic')) {
        void qc.invalidateQueries({ queryKey: ['interview-profile'] });
      }
    },
  });
}

export function useRetryInterview(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ profile: InterviewProfile; status: string }>(
        `/api/interview/profiles/${profileId}/retry`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-profiles'] });
      void qc.invalidateQueries({ queryKey: ['interview-profile', profileId] });
    },
  });
}

export function useAnalyzeInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { job_id: string; cv_id?: string; extra_context?: string }) =>
      apiFetch<{ profile: InterviewProfile; status: string }>('/api/interview/analyze', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-profiles'] });
    },
  });
}

export function usePrepareInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { profileId: string; force?: boolean }) => {
      const profileId = typeof input === 'string' ? input : input.profileId;
      const force = typeof input === 'object' ? input.force : undefined;
      return apiFetch('/api/interview/prepare', {
        method: 'POST',
        body: JSON.stringify({ profile_id: profileId, force: force === true }),
      });
    },
    onSuccess: (_d, input) => {
      const profileId = typeof input === 'string' ? input : input.profileId;
      void qc.invalidateQueries({ queryKey: ['interview-profile', profileId] });
      void qc.invalidateQueries({ queryKey: ['prep-questions', profileId] });
    },
  });
}

export function useGenerateQuiz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { profile_id: string; topic_id?: string; difficulty?: string }) =>
      apiFetch<{ quiz: { id: string }; questions: unknown[] }>('/api/interview/quizzes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (_d, body) => {
      void qc.invalidateQueries({ queryKey: ['interview-profile', body.profile_id] });
    },
  });
}

export function useStartInterviewSession() {
  return useMutation({
    mutationFn: (body: {
      profile_id: string;
      type?: string;
      mode?: string;
      difficulty?: string;
    }) =>
      apiFetch<{
        session: { id: string };
        question: Record<string, unknown> | null;
        resumed: boolean;
      }>('/api/interview/sessions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useInterviewSession(sessionId: string) {
  return useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: () =>
      apiFetch<{
        session: Record<string, unknown>;
        questions: Record<string, unknown>[];
        current_question: Record<string, unknown> | null;
        latest_evaluation: Record<string, unknown> | null;
        answered_questions: Array<{
          question: Record<string, unknown>;
          answer: Record<string, unknown>;
          evaluation: Record<string, unknown> | null;
        }>;
      }>(`/api/interview/sessions/${sessionId}`),
    enabled: Boolean(sessionId),
    refetchInterval: false,
  });
}

export function useSaveSessionDraft(sessionId: string) {
  return useMutation({
    mutationFn: (draft_answer: string) =>
      apiFetch(`/api/interview/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ draft_answer }),
      }),
  });
}

export function useDebouncedSessionDraft(sessionId: string) {
  const save = useSaveSessionDraft(sessionId);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (draft: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void save.mutateAsync(draft).catch(() => undefined);
      }, 600);
    },
    [save]
  );
}

export function useSubmitInterviewAnswer(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      text_answer?: string;
      transcript?: string;
      audio_path?: string;
      duration_seconds?: number;
    }) =>
      apiFetch(`/api/interview/sessions/${sessionId}/answer`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-session', sessionId] });
    },
  });
}

export function useCompleteInterviewSession(sessionId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/interview/sessions/${sessionId}/complete`, { method: 'POST' }),
  });
}

export function useDeleteInterviewProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      apiFetch<{ ok: boolean }>(`/api/interview/profiles/${profileId}`, { method: 'DELETE' }),
    onSuccess: (_d, profileId) => {
      void qc.invalidateQueries({ queryKey: ['interview-profiles'] });
      void qc.removeQueries({ queryKey: ['interview-profile', profileId] });
    },
  });
}

export function useClarifyInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { profile_id: string; answers: Record<string, string> }) =>
      apiFetch<{
        profile: InterviewProfile;
        status: string;
        plan?: Record<string, unknown> | null;
        topics?: Record<string, unknown>[];
      }>('/api/interview/clarify', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['interview-profile', body.profile_id] });
      qc.setQueryData<ProfileDashboardData>(
        ['interview-profile', body.profile_id],
        (old) =>
          old
            ? {
                ...old,
                profile: { ...old.profile, status: 'analyzing' },
              }
            : old
      );
    },
    onSettled: (_d, _e, body) => {
      void qc.invalidateQueries({ queryKey: ['interview-profile', body.profile_id] });
    },
  });
}

export function useQuizAttempt(quizId: string) {
  return useQuery({
    queryKey: ['interview-quiz-attempt', quizId],
    queryFn: () =>
      apiFetch<{ attempt: { answers_json?: { answers?: Record<string, string>; current_step?: number } } | null }>(
        `/api/interview/quizzes/${quizId}/attempt`
      ),
    enabled: Boolean(quizId),
  });
}

export function useSaveQuizDraft(quizId: string) {
  return useMutation({
    mutationFn: (body: { answers: Record<string, string>; current_step: number }) =>
      apiFetch(`/api/interview/quizzes/${quizId}/attempt`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  });
}

export function useUpdateTopic(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { topicId: string; status: 'pending' | 'done' }) =>
      apiFetch(`/api/interview/topics/${body.topicId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: body.status }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-profile', profileId] });
    },
  });
}

export function usePrepQuestions(profileId: string) {
  return useQuery({
    queryKey: ['interview-prep-questions', profileId],
    queryFn: () =>
      apiFetch<{ questions: Record<string, unknown>[] }>(
        `/api/interview/profiles/${profileId}/prep-questions`
      ),
    enabled: Boolean(profileId),
    staleTime: 15_000,
  });
}

export function useGeneratePrepQuestions(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { topic_id?: string | null }) =>
      apiFetch<{ questions: Record<string, unknown>[]; batch_number: number }>(
        `/api/interview/profiles/${profileId}/prep-questions`,
        {
          method: 'POST',
          body: JSON.stringify({ topic_id: body?.topic_id ?? null }),
        }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-prep-questions', profileId] });
    },
  });
}

export function useUpdatePrepQuestionAnswer(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { questionId: string; answer_text: string }) =>
      apiFetch(`/api/interview/prep-questions/${body.questionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ answer_text: body.answer_text }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-prep-questions', profileId] });
    },
  });
}

export type PrepExplainResult = {
  explanation: string;
  input_tokens: number;
  output_tokens: number;
};

export function useExplainPrepQuestion() {
  return useMutation({
    mutationFn: (body: {
      questionId: string;
      message?: string;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
    }) =>
      apiFetch<PrepExplainResult>(`/api/interview/prep-questions/${body.questionId}/explain`, {
        method: 'POST',
        body: JSON.stringify({ message: body.message, history: body.history }),
      }),
  });
}

export function useGeneratePrepQuestionExample(profileId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiFetch<{
        question: Record<string, unknown>;
        input_tokens: number;
        output_tokens: number;
      }>(`/api/interview/prep-questions/${questionId}/example`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['interview-prep-questions', profileId] });
    },
  });
}

export type PrepReshapeResult = {
  answer_text: string;
  input_tokens: number;
  output_tokens: number;
};

export function useReshapePrepQuestion() {
  return useMutation({
    mutationFn: (body: {
      questionId: string;
      draft: string;
      tone: string;
      target_chars: number;
    }) =>
      apiFetch<PrepReshapeResult>(`/api/interview/prep-questions/${body.questionId}/reshape`, {
        method: 'POST',
        body: JSON.stringify({
          draft: body.draft,
          tone: body.tone,
          target_chars: body.target_chars,
        }),
      }),
  });
}
