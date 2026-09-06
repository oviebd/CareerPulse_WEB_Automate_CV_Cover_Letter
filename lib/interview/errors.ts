export type InterviewErrorCode =
  | 'CV_NOT_FOUND'
  | 'JOB_NOT_FOUND'
  | 'JOB_CONTEXT_INSUFFICIENT'
  | 'ANALYSIS_FAILED'
  | 'UPGRADE_REQUIRED'
  | 'SCHEMA_NOT_MIGRATED'
  | 'PROFILE_NOT_READY'
  | 'TOPIC_CONFIG_INVALID'
  | 'PROFILE_NOT_FOUND'
  | 'TOPICS_REQUIRED'
  | 'TOPIC_NOT_FOUND';

export class InterviewError extends Error {
  code: InterviewErrorCode;

  constructor(code: InterviewErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'InterviewError';
  }
}

function isSchemaMissingError(msg: string) {
  return (
    msg.includes('interview_profiles') &&
    (msg.includes('does not exist') ||
      msg.includes('Failed query') ||
      msg.includes('relation') ||
      msg.includes('undefined_table'))
  );
}

export function mapOrchestratorError(e: unknown): InterviewError {
  if (e instanceof InterviewError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (isSchemaMissingError(msg)) {
    return new InterviewError(
      'SCHEMA_NOT_MIGRATED',
      'Interview preparation tables are not set up. Run: npm run db:migrate-interview'
    );
  }
  if (msg.includes('CV not found')) {
    return new InterviewError('CV_NOT_FOUND', 'Create a CV in Documents before starting interview preparation.');
  }
  if (msg.includes('Job not found')) {
    return new InterviewError('JOB_NOT_FOUND', 'Job not found.');
  }
  if (msg.includes('Profile not ready')) {
    return new InterviewError(
      'PROFILE_NOT_READY',
      'Complete interview analysis before starting quizzes or mock interviews.'
    );
  }
  if (msg.includes('Generate preparation topics')) {
    return new InterviewError(
      'TOPICS_REQUIRED',
      'Generate preparation topics before loading questions or quizzes.'
    );
  }
  if (msg.includes('Topic not found')) {
    return new InterviewError('TOPIC_NOT_FOUND', 'That topic is not part of this preparation plan.');
  }
  if (msg.includes('invalid_json_response') || msg.includes('JSON')) {
    return new InterviewError(
      'ANALYSIS_FAILED',
      'AI response could not be parsed. Please try Continue preparation again.'
    );
  }
  return new InterviewError('ANALYSIS_FAILED', 'Analysis failed. Please try again.');
}
