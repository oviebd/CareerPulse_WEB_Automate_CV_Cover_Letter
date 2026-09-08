import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  decimal,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const jobStatusEnum = pgEnum('job_status', [
  'none',
  'apply_later',
  'applied',
  'interviewing',
  'technical_test',
  'offer_received',
  'negotiating',
  'offered',
  'rejected',
  'withdrawn',
  'ghosted',
  'archived',
]);


export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('user'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  subscriptionStatus: text('subscription_status').notNull().default('inactive'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  isOnboarded: boolean('is_onboarded').notNull().default(false),
  preferredClTemplateId: text('preferred_cl_template_id').default('cl-classic'),
  promoCodeUsed: text('promo_code_used'),
  canUseAi: boolean('can_use_ai').notNull().default(true),
  canCreateDocuments: boolean('can_create_documents').notNull().default(true),
  canUseInterviewPrep: boolean('can_use_interview_prep').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cvs = pgTable('cvs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Untitled CV'),
  fullName: text('full_name'),
  professionalTitle: text('professional_title'),
  email: text('email'),
  phone: text('phone'),
  location: text('location'),
  address: text('address'),
  photoUrl: text('photo_url'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  links: jsonb('links').notNull().default([]),
  summary: text('summary'),
  experience: jsonb('experience').notNull().default([]),
  education: jsonb('education').notNull().default([]),
  skills: jsonb('skills').notNull().default([]),
  projects: jsonb('projects').notNull().default([]),
  certifications: jsonb('certifications').notNull().default([]),
  languages: jsonb('languages').notNull().default([]),
  awards: jsonb('awards').notNull().default([]),
  referrals: jsonb('referrals').notNull().default([]),
  sectionVisibility: jsonb('section_visibility').notNull().default({}),
  cvExtra: jsonb('cv_extra').notNull().default({}),
  preferredTemplateId: text('preferred_template_id').default('classic'),
  fontFamily: text('font_family').default('Inter'),
  accentColor: text('accent_color').default('#6C63FF'),
  jobIds: uuid('job_ids').array().notNull().default([]),
  aiChangesSummary: text('ai_changes_summary'),
  keywordsAdded: jsonb('keywords_added').notNull().default([]),
  bulletsImproved: integer('bullets_improved').default(0),
  originalCvFileUrl: text('original_cv_file_url'),
  isComplete: boolean('is_complete').notNull().default(false),
  completionPercentage: integer('completion_percentage').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  jobTitle: text('job_title').notNull(),
  jobUrl: text('job_url'),
  jobDescription: text('job_description'),
  location: text('location'),
  salaryMin: integer('salary_min'),
  salaryMax: integer('salary_max'),
  salaryCurrency: text('salary_currency').notNull().default('USD'),
  workType: text('work_type'),
  status: jobStatusEnum('status').notNull().default('none'),
  keywords: jsonb('keywords').notNull().default([]),
  jobSummary: text('job_summary'),
  savedAt: timestamp('saved_at', { withTimezone: true }),
  appliedAt: timestamp('applied_at', { withTimezone: true }),
  interviewAt: timestamp('interview_at', { withTimezone: true }),
  offerAt: timestamp('offer_at', { withTimezone: true }),
  deadline: timestamp('deadline', { withTimezone: true }),
  notes: text('notes'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  priority: text('priority').notNull().default('medium'),
  isStarred: boolean('is_starred').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const coverLetters = pgTable('cover_letters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Untitled Cover Letter'),
  companyName: text('company_name'),
  jobTitle: text('job_title'),
  jobDescription: text('job_description').default(''),
  tone: text('tone'),
  length: text('length'),
  specificEmphasis: text('specific_emphasis'),
  content: text('content'),
  atsScore: integer('ats_score'),
  atsKeywordsFound: jsonb('ats_keywords_found').notNull().default([]),
  atsKeywordsMissing: jsonb('ats_keywords_missing').notNull().default([]),
  atsSummary: text('ats_summary'),
  templateId: text('template_id').default('cl-classic'),
  pdfUrl: text('pdf_url'),
  docxUrl: text('docx_url'),
  shareToken: text('share_token').unique(),
  isFavourited: boolean('is_favourited').notNull().default(false),
  generationModel: text('generation_model'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  jobIds: uuid('job_ids').array().notNull().default([]),
  applicantName: text('applicant_name'),
  applicantRole: text('applicant_role'),
  applicantEmail: text('applicant_email'),
  applicantPhone: text('applicant_phone'),
  applicantLocation: text('applicant_location'),
  sourceType: text('source_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  tranId: text('tran_id').notNull().unique(),
  valId: text('val_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  plan: text('plan').notNull(),
  billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }),
  billingPeriodEnd: timestamp('billing_period_end', { withTimezone: true }),
  gatewayResponse: jsonb('gateway_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cvTemplates = pgTable('cv_templates', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  previewImageUrl: text('preview_image_url'),
  category: text('category'),
  isPremium: boolean('is_premium').default(false),
  availableTiers: text('available_tiers').array().default(['free', 'pro']),
  sortOrder: integer('sort_order').default(0),
});

export const interviewProfileStatusEnum = pgEnum('interview_profile_status', [
  'idle',
  'analyzing',
  'needs_clarification',
  'ready',
  'failed',
]);

export const interviewProfiles = pgTable(
  'interview_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }),
    cvId: uuid('cv_id').references(() => cvs.id, { onDelete: 'set null' }),
    prepSource: text('prep_source').notNull().default('job'),
    topicConfigJson: jsonb('topic_config_json'),
    status: interviewProfileStatusEnum('status').notNull().default('idle'),
    profession: text('profession'),
    occupation: text('occupation'),
    role: text('role'),
    domain: text('domain'),
    seniority: text('seniority'),
    interviewStage: text('interview_stage'),
    interviewDate: timestamp('interview_date', { withTimezone: true }),
    candidateSummary: text('candidate_summary'),
    jobSummary: text('job_summary'),
    blueprintJson: jsonb('blueprint_json'),
    gapJson: jsonb('gap_json'),
    clarificationJson: jsonb('clarification_json'),
    aiMetadataJson: jsonb('ai_metadata_json'),
    readinessScore: integer('readiness_score'),
    sourceJobHash: text('source_job_hash'),
    sourceCvHash: text('source_cv_hash'),
    extraContext: text('extra_context'),
    jobAnalysisJson: jsonb('job_analysis_json'),
    candidateAnalysisJson: jsonb('candidate_analysis_json'),
    mappedContextJson: jsonb('mapped_context_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('interview_profiles_user_job_uidx')
      .on(t.userId, t.jobId)
      .where(sql`${t.jobId} IS NOT NULL`),
    index('interview_profiles_user_id_idx').on(t.userId),
    index('interview_profiles_job_id_idx').on(t.jobId),
    index('interview_profiles_prep_source_idx').on(t.prepSource),
  ]
);

export const interviewCompetencies = pgTable(
  'interview_competencies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category'),
    description: text('description'),
    importance: text('importance'),
    priority: integer('priority'),
    evidenceFromJob: text('evidence_from_job'),
    evidenceFromCandidate: text('evidence_from_candidate'),
    masteryScore: integer('mastery_score'),
    metadataJson: jsonb('metadata_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_competencies_profile_idx').on(t.interviewProfileId)]
);

export const interviewPreparationPlans = pgTable(
  'interview_preparation_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    title: text('title'),
    durationDays: integer('duration_days'),
    status: text('status').notNull().default('active'),
    planJson: jsonb('plan_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_prep_plans_profile_idx').on(t.interviewProfileId)]
);

export const interviewPreparationTopics = pgTable(
  'interview_preparation_topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => interviewPreparationPlans.id, { onDelete: 'cascade' }),
    competencyId: uuid('competency_id').references(() => interviewCompetencies.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    description: text('description'),
    priority: integer('priority'),
    estimatedMinutes: integer('estimated_minutes'),
    learningObjectivesJson: jsonb('learning_objectives_json'),
    masteryScore: integer('mastery_score'),
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_prep_topics_plan_idx').on(t.planId)]
);

export const interviewQuizzes = pgTable(
  'interview_quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => interviewPreparationTopics.id, {
      onDelete: 'set null',
    }),
    title: text('title'),
    difficulty: text('difficulty'),
    questionCount: integer('question_count'),
    metadataJson: jsonb('metadata_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_quizzes_profile_idx').on(t.interviewProfileId)]
);

export const interviewQuizQuestions = pgTable(
  'interview_quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => interviewQuizzes.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    questionType: text('question_type').notNull(),
    questionText: text('question_text').notNull(),
    optionsJson: jsonb('options_json'),
    correctAnswerJson: jsonb('correct_answer_json'),
    evaluationRubricJson: jsonb('evaluation_rubric_json'),
    explanation: text('explanation'),
    competencyId: uuid('competency_id').references(() => interviewCompetencies.id, {
      onDelete: 'set null',
    }),
    difficulty: text('difficulty'),
    metadataJson: jsonb('metadata_json'),
  },
  (t) => [index('interview_quiz_questions_quiz_idx').on(t.quizId)]
);

export const interviewQuizAttempts = pgTable(
  'interview_quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => interviewQuizzes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    score: integer('score'),
    answersJson: jsonb('answers_json'),
    evaluationJson: jsonb('evaluation_json'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('interview_quiz_attempts_quiz_idx').on(t.quizId)]
);

export const interviewSessions = pgTable(
  'interview_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('mock'),
    mode: text('mode').notNull().default('practice'),
    difficulty: text('difficulty'),
    status: text('status').notNull().default('active'),
    questionCount: integer('question_count').notNull().default(0),
    targetQuestionCount: integer('target_question_count'),
    durationMinutes: integer('duration_minutes'),
    currentQuestionId: uuid('current_question_id'),
    draftAnswer: text('draft_answer'),
    overallScore: integer('overall_score'),
    evaluationJson: jsonb('evaluation_json'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('interview_sessions_profile_idx').on(t.interviewProfileId),
    index('interview_sessions_status_idx').on(t.interviewProfileId, t.status),
  ]
);

export const interviewQuestions = pgTable(
  'interview_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    questionType: text('question_type').notNull(),
    questionText: text('question_text').notNull(),
    competencyId: uuid('competency_id').references(() => interviewCompetencies.id, {
      onDelete: 'set null',
    }),
    difficulty: text('difficulty'),
    expectedPointsJson: jsonb('expected_points_json'),
    evaluationRubricJson: jsonb('evaluation_rubric_json'),
    parentQuestionId: uuid('parent_question_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_questions_session_idx').on(t.sessionId)]
);

export const interviewAnswers = pgTable(
  'interview_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => interviewQuestions.id, { onDelete: 'cascade' }),
    textAnswer: text('text_answer'),
    transcript: text('transcript'),
    audioPath: text('audio_path'),
    durationSeconds: integer('duration_seconds'),
    attemptNumber: integer('attempt_number').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_answers_question_idx').on(t.questionId)]
);

export const interviewEvaluations = pgTable(
  'interview_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    answerId: uuid('answer_id')
      .notNull()
      .references(() => interviewAnswers.id, { onDelete: 'cascade' }),
    overallScore: integer('overall_score'),
    dimensionScoresJson: jsonb('dimension_scores_json'),
    strengthsJson: jsonb('strengths_json'),
    weaknessesJson: jsonb('weaknesses_json'),
    missingPointsJson: jsonb('missing_points_json'),
    feedback: text('feedback'),
    recommendedActionsJson: jsonb('recommended_actions_json'),
    aiMetadataJson: jsonb('ai_metadata_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('interview_evaluations_answer_idx').on(t.answerId)]
);

export const interviewMastery = pgTable(
  'interview_mastery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    competencyId: uuid('competency_id')
      .notNull()
      .references(() => interviewCompetencies.id, { onDelete: 'cascade' }),
    masteryScore: integer('mastery_score').notNull().default(0),
    confidence: integer('confidence'),
    evidenceCount: integer('evidence_count').notNull().default(0),
    lastAssessedAt: timestamp('last_assessed_at', { withTimezone: true }),
    trend: text('trend'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('interview_mastery_profile_competency_uidx').on(
      t.interviewProfileId,
      t.competencyId
    ),
    index('interview_mastery_profile_idx').on(t.interviewProfileId),
  ]
);

export const interviewPrepQuestions = pgTable(
  'interview_prep_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    interviewProfileId: uuid('interview_profile_id')
      .notNull()
      .references(() => interviewProfiles.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id').references(() => interviewPreparationTopics.id, {
      onDelete: 'set null',
    }),
    batchNumber: integer('batch_number').notNull(),
    sequence: integer('sequence').notNull(),
    questionType: text('question_type').notNull(),
    questionText: text('question_text').notNull(),
    competencyId: uuid('competency_id').references(() => interviewCompetencies.id, {
      onDelete: 'set null',
    }),
    difficulty: text('difficulty'),
    answerText: text('answer_text').notNull(),
    answerSource: text('answer_source').notNull().default('ai'),
    relevance: text('relevance').notNull().default('supported'),
    evidenceFromCv: text('evidence_from_cv'),
    whySelected: text('why_selected'),
    exampleAnswer: text('example_answer'),
    aiMetadataJson: jsonb('ai_metadata_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('interview_prep_questions_profile_idx').on(t.interviewProfileId),
    index('interview_prep_questions_profile_seq_idx').on(t.interviewProfileId, t.sequence),
    index('interview_prep_questions_profile_topic_idx').on(t.interviewProfileId, t.topicId),
  ]
);

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creditBalances = pgTable('credit_balances', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  balance: decimal('balance', { precision: 12, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const creditRuleVersions = pgTable(
  'credit_rule_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inputTokenUnit: integer('input_token_unit').notNull().default(1000),
    inputTokenCredits: decimal('input_token_credits', { precision: 12, scale: 4 }).notNull().default('1'),
    outputTokenUnit: integer('output_token_unit').notNull().default(1000),
    outputTokenCredits: decimal('output_token_credits', { precision: 12, scale: 4 }).notNull().default('5'),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [index('credit_rule_versions_active_idx').on(t.isActive)]
);

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
    balanceBefore: decimal('balance_before', { precision: 12, scale: 4 }).notNull(),
    balanceAfter: decimal('balance_after', { precision: 12, scale: 4 }).notNull(),
    source: text('source'),
    referenceId: uuid('reference_id'),
    aiUsageId: uuid('ai_usage_id'),
    description: text('description'),
    ruleSnapshot: jsonb('rule_snapshot'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('credit_transactions_user_created_idx').on(t.userId, t.createdAt),
    index('credit_transactions_type_idx').on(t.type),
    index('credit_transactions_ai_usage_idx').on(t.aiUsageId),
  ]
);

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  maxRedemptions: integer('max_redemptions'),
  redemptionCount: integer('redemption_count').notNull().default(0),
  grantsPlan: text('grants_plan'),
  bonusCredits: integer('bonus_credits').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aiUsageEvents = pgTable(
  'ai_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    operation: text('operation').notNull(),
    inputChars: integer('input_chars').notNull().default(0),
    outputChars: integer('output_chars').notNull().default(0),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    charsPerToken: integer('chars_per_token').notNull().default(5),
    model: text('model'),
    promptVersion: text('prompt_version'),
    relatedId: uuid('related_id'),
    provider: text('provider').default('anthropic'),
    feature: text('feature'),
    requestId: text('request_id'),
    creditsConsumed: decimal('credits_consumed', { precision: 12, scale: 4 }).notNull().default('0'),
    creditRuleVersion: uuid('credit_rule_version').references(() => creditRuleVersions.id, {
      onDelete: 'set null',
    }),
    tokenSource: text('token_source').notNull().default('api'),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ai_usage_events_user_created_idx').on(t.userId, t.createdAt),
    index('ai_usage_events_user_category_idx').on(t.userId, t.category),
    index('ai_usage_events_feature_created_idx').on(t.feature, t.createdAt),
  ]
);

export type DbUser = typeof users.$inferSelect;
export type DbProfile = typeof profiles.$inferSelect;
export type DbCreditBalance = typeof creditBalances.$inferSelect;
export type DbCreditTransaction = typeof creditTransactions.$inferSelect;
export type DbCreditRuleVersion = typeof creditRuleVersions.$inferSelect;
export type DbPromoCode = typeof promoCodes.$inferSelect;
export type DbPlan = typeof plans.$inferSelect;
