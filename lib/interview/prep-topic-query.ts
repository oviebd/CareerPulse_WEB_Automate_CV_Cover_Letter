export const PREP_TOPIC_ALL = 'all';

export function parsePrepTopicParam(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === PREP_TOPIC_ALL) return PREP_TOPIC_ALL;
  return trimmed;
}

export function topicIdForApi(filter: string): string | undefined {
  return filter === PREP_TOPIC_ALL ? undefined : filter;
}

export function quizHref(profileId: string, quizId: string, topicFilter: string) {
  const topic = topicIdForApi(topicFilter);
  return topic
    ? `/interview/${profileId}/quiz/${quizId}?topic=${encodeURIComponent(topic)}`
    : `/interview/${profileId}/quiz/${quizId}`;
}

export function quizReviewHref(
  profileId: string,
  quizId: string,
  attemptId: string,
  topicFilter: string
) {
  const base = `/interview/${profileId}/quiz/${quizId}/review/${attemptId}`;
  const topic = topicIdForApi(topicFilter);
  return topic ? `${base}?topic=${encodeURIComponent(topic)}` : base;
}

export function prepDashboardHref(profileId: string, tab: string, topicFilter: string) {
  const params = new URLSearchParams();
  params.set('tab', tab);
  const topic = topicIdForApi(topicFilter);
  if (topic) params.set('topic', topic);
  return `/interview/${profileId}?${params.toString()}`;
}
