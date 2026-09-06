export type PrepTab = 'topics' | 'questions' | 'quiz' | 'mock';

export const PREP_TABS: PrepTab[] = ['topics', 'questions', 'quiz', 'mock'];

export function parsePrepTab(value: string | null): PrepTab {
  if (value && PREP_TABS.includes(value as PrepTab)) return value as PrepTab;
  return 'questions';
}
