export const QUIZ_QUESTION_TYPES = [
  'single_choice',
  'multiple_select',
  'true_false',
  'scenario',
] as const;

export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number];

function normalizeTrueFalse(value: unknown): string | null {
  if (value === true || value === 'true' || value === 'True') return 'true';
  if (value === false || value === 'false' || value === 'False') return 'false';
  return null;
}

function normalizeMultiSelect(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...value].map(String).sort();
  }
  if (typeof value === 'string' && value.includes('|||')) {
    return value.split('|||').filter(Boolean).sort();
  }
  if (typeof value === 'string' && value.trim()) {
    return [value];
  }
  return [];
}

export function isQuizQuestionType(type: string): type is QuizQuestionType {
  return (QUIZ_QUESTION_TYPES as readonly string[]).includes(type);
}

export function evaluateQuizAnswerLocal(
  questionType: string,
  correctAnswer: unknown,
  userAnswer: string
): { correct: boolean; score: number } {
  if (questionType === 'true_false') {
    const expected = normalizeTrueFalse(correctAnswer);
    const actual = normalizeTrueFalse(userAnswer);
    const correct = expected !== null && expected === actual;
    return { correct, score: correct ? 10 : 0 };
  }

  if (questionType === 'multiple_select') {
    const expected = normalizeMultiSelect(correctAnswer);
    const actual = normalizeMultiSelect(userAnswer);
    const correct =
      expected.length > 0 &&
      expected.length === actual.length &&
      expected.every((v, i) => v === actual[i]);
    return { correct, score: correct ? 10 : 0 };
  }

  if (questionType === 'single_choice' || questionType === 'scenario') {
    const expected = String(correctAnswer ?? '').trim();
    const actual = userAnswer.trim();
    const correct = expected.length > 0 && expected === actual;
    return { correct, score: correct ? 10 : 0 };
  }

  // Legacy multiple_choice maps to single_choice behavior
  if (questionType === 'multiple_choice') {
    const expected = String(correctAnswer ?? '').trim();
    const actual = userAnswer.trim();
    const correct = expected.length > 0 && expected === actual;
    return { correct, score: correct ? 10 : 0 };
  }

  return { correct: false, score: 0 };
}
