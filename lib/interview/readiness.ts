import type { ReadinessBreakdown } from '@/types/interview';

export type ProgressInput = {
  topics: Array<Record<string, unknown>>;
  quizAttempts: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
};

export function calculateReadiness(input: ProgressInput): ReadinessBreakdown {
  const topicsTotal = input.topics.length;
  const topicsDone = input.topics.filter((t) => t.status === 'done').length;
  const topicPoints =
    topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 70) : 0;

  const quizCompleted = input.quizAttempts.some((a) => Boolean(a.completed_at));
  const mockCompleted = input.sessions.some(
    (s) => s.status === 'completed' && Boolean(s.completed_at)
  );

  const quizPoints = quizCompleted ? 15 : 0;
  const mockPoints = mockCompleted ? 15 : 0;
  const overall = Math.max(0, Math.min(100, topicPoints + quizPoints + mockPoints));

  let next_action = 'Generate preparation topics to get started.';
  if (topicsTotal === 0) {
    next_action = 'Generate preparation topics to begin tracking progress.';
  } else if (topicsDone < topicsTotal) {
    const remaining = topicsTotal - topicsDone;
    next_action = `Mark ${remaining} more topic${remaining === 1 ? '' : 's'} as done (${Math.round(70 / topicsTotal)}% each).`;
  } else if (!quizCompleted) {
    next_action = 'Take a quiz to unlock the next 15% of your progress.';
  } else if (!mockCompleted) {
    next_action = 'Complete a mock interview to reach 100% preparation progress.';
  } else {
    next_action = 'You have completed all preparation milestones. Keep practicing before your interview.';
  }

  return {
    overall,
    topic_points: topicPoints,
    quiz_points: quizPoints,
    mock_points: mockPoints,
    topics_done: topicsDone,
    topics_total: topicsTotal,
    quiz_completed: quizCompleted,
    mock_completed: mockCompleted,
    next_action,
  };
}
