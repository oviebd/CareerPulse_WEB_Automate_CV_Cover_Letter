/** Build compact AI context layers — never send full CV/JD. */

export function summarizeSessionForAi(
  questions: Array<{ question_text: string; sequence: number }>,
  answers: Array<{ text_answer: string | null; transcript: string | null }>,
  limit = 4
): string {
  const pairs = questions.slice(-limit).map((q, i) => {
    const a = answers[i];
    const ans = a?.transcript ?? a?.text_answer ?? '(no answer)';
    return `Q${q.sequence}: ${q.question_text.slice(0, 200)}\nA: ${ans.slice(0, 400)}`;
  });
  return pairs.join('\n\n');
}

export function summarizeMasteryForAi(
  rows: Array<{ name: string; mastery_score: number; trend?: string | null }>
): string {
  return rows
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 8)
    .map((r) => `${r.name}: ${r.mastery_score}% (${r.trend ?? 'stable'})`)
    .join(', ');
}

export function summarizeEvaluationsForReport(
  pairs: Array<{
    sequence: number;
    question_text: string;
    answer_text: string;
    overall_score: number | null;
    strengths: string[];
    weaknesses: string[];
    feedback: string | null;
  }>
): string {
  return pairs
    .map((p) => {
      const q = p.question_text.slice(0, 120);
      const a = p.answer_text.slice(0, 150);
      const score = p.overall_score != null ? `${p.overall_score / 10}/10` : '—';
      const str = p.strengths.slice(0, 1).join('; ') || '—';
      const weak = p.weaknesses.slice(0, 1).join('; ') || '—';
      const fb = (p.feedback ?? '').slice(0, 120);
      return `Q${p.sequence}: ${q}\nA: ${a}\nScore: ${score} | Strength: ${str} | Weakness: ${weak}\nNote: ${fb}`;
    })
    .join('\n\n');
}

export function blueprintSummary(blueprint: Record<string, unknown> | null): string {
  if (!blueprint) return '{}';
  const strategy = (blueprint.interview_strategy ?? {}) as Record<string, unknown>;
  return JSON.stringify(
    {
      objectives: strategy.objectives,
      dimensions: strategy.evaluation_dimensions,
      categories: strategy.question_categories,
      question_count: strategy.question_count,
      duration: strategy.duration_minutes,
    },
    null,
    0
  );
}
