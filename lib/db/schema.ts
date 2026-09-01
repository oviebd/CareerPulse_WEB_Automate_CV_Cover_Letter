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
} from 'drizzle-orm/pg-core';

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

export type DbUser = typeof users.$inferSelect;
export type DbProfile = typeof profiles.$inferSelect;
