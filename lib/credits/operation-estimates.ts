/** Typical credit costs for user-facing estimates (see docs/ai-credits-and-usage-estimates.md). */
export type CreditOperationEstimate = {
  id: string;
  label: string;
  typicalCredits: number;
  detail?: string;
};

export const CREDIT_OPERATION_ESTIMATES: CreditOperationEstimate[] = [
  {
    id: 'job_specific_cv',
    label: 'Job-specific CV',
    typicalCredits: 24,
    detail: 'Tailoring your CV to a job description.',
  },
  {
    id: 'cover_letter',
    label: 'Cover letter',
    typicalCredits: 4,
    detail: 'Generating a new cover letter.',
  },
  {
    id: 'interview_prep_creation',
    label: 'Interview prep creation',
    typicalCredits: 35,
    detail: 'Full interview analysis and prep setup for a role.',
  },
  {
    id: 'interview',
    label: 'Interview (mock session)',
    typicalCredits: 28,
    detail: 'Mock questions, answers, and session report.',
  },
];

/** Wallet balance often needed to start job-specific CV (pre-call reservation; unused hold is released). */
export const JOB_SPECIFIC_CV_RESERVATION_NOTE_CREDITS = 45;
