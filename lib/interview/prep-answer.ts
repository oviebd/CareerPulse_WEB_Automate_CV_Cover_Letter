export const PREP_ANSWER_MAX_CHARS = 1500;

export const PREP_ANSWER_TARGET_CHARS = 1000;

export const PREP_RESHAPE_TONES = ['professional', 'easy', 'confident', 'concise'] as const;
export type PrepReshapeTone = (typeof PREP_RESHAPE_TONES)[number];

export const PREP_RESHAPE_LENGTHS = [800, 1000, 1500] as const;
export type PrepReshapeLength = (typeof PREP_RESHAPE_LENGTHS)[number];

export const PREP_RESHAPE_DRAFT_MAX_CHARS = 4000;

export function clampPrepAnswer(value: string): string {
  return value.slice(0, PREP_ANSWER_MAX_CHARS);
}

export function isPrepReshapeTone(value: string): value is PrepReshapeTone {
  return (PREP_RESHAPE_TONES as readonly string[]).includes(value);
}

export function isPrepReshapeLength(value: number): value is PrepReshapeLength {
  return (PREP_RESHAPE_LENGTHS as readonly number[]).includes(value);
}

type DisplayablePrepAnswer = {
  answer_text: string;
  example_answer?: string | null;
  answer_source?: string;
};

/** Prefer a stored sample for AI/legacy guideline rows; keep user edits as-is. */
export function displayPrepAnswer(question: DisplayablePrepAnswer): string {
  const example = question.example_answer?.trim() ?? '';
  if (question.answer_source !== 'user' && example) {
    return example;
  }
  return question.answer_text;
}
