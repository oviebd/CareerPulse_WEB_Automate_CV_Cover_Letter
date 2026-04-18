import type { JobStatus } from './database';

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro' | 'premium' | 'career';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due';
export type CoverLetterTone =
  | 'professional'
  | 'confident'
  | 'creative'
  | 'concise'
  | 'formal';
export type CoverLetterLength = 'short' | 'medium' | 'long';

export type {
  CV as CVRow,
  CoverLetter,
  Job,
  JobStatus,
  LinkedCV,
  LinkedCoverLetter,
} from './database';

/** Structured output from POST /api/jobs/analyze */
export interface JobAnalysisResult {
  jobTitle: string | null;
  company: string | null;
  shortDescription: string;
  keyRequirements: string[];
  region: string | null;
  workType: 'remote' | 'onsite' | 'hybrid' | null;
  matchPercentage: number;
  whyGoodFit: string[];
  whyNotGoodFit: string[];
  keywords: string[];
  jobSummary: string;
}

export type GenerationType = 'cv' | 'coverLetter' | 'both';

/** Client-only draft after optimise/analyse — persisted only after explicit Save */
export interface DraftResult {
  cv?: string;
  coverLetter?: string;
  generationType: GenerationType;
  jobDescription: string;
  jobUrl: string | null;
  analysis: JobAnalysisResult | null;
  originalCvId: string;
  savedJobId: string | null;
  savedCvId: string | null;
  /** When only a cover letter was saved, or alongside CV */
  savedCoverLetterId?: string | null;
  isTracked: boolean;
  /** CV optimise extras */
  extractedKeywords?: string[];
  jobTitle?: string | null;
  companyName?: string | null;
  aiChangesSummary?: string;
  bulletsImproved?: number;
  warnings?: string[];
  /** Cover letter generation options */
  coverLetterTone?: CoverLetterTone;
  coverLetterLength?: CoverLetterLength;
  coverLetterEmphasis?: string;
}

export type { CVUpdate, CVInsert, JobInsert, JobUpdate, CoverLetterUpdate } from './database';

/** @deprecated Use JobStatus from ./database */
export type ApplicationStatus = import('./database').JobStatus;

/** UI config for every non-`none` job status (tracker, job CV editor) */
export const JOB_STATUS_CONFIG: Record<
  Exclude<JobStatus, 'none'>,
  {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    textColor: string;
    borderClass: string;
  }
> = {
  apply_later: {
    label: 'Apply Later',
    emoji: '📌',
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-950/45',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-200',
  },
  applied: {
    label: 'Applied',
    emoji: '✅',
    color: 'indigo',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/45',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderClass: 'border-indigo-500 text-indigo-800 dark:border-indigo-400 dark:text-indigo-200',
  },
  interviewing: {
    label: 'Interviewing',
    emoji: '🗣',
    color: 'amber',
    bgColor: 'bg-amber-50 dark:bg-amber-950/45',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-500 text-amber-800 dark:border-amber-400 dark:text-amber-200',
  },
  technical_test: {
    label: 'Technical Test',
    emoji: '💻',
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-950/45',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-500 text-orange-800 dark:border-orange-400 dark:text-orange-200',
  },
  offer_received: {
    label: 'Offer Received',
    emoji: '🎉',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-950/45',
    textColor: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-500 text-green-800 dark:border-green-400 dark:text-green-200',
  },
  negotiating: {
    label: 'Negotiating',
    emoji: '🤝',
    color: 'teal',
    bgColor: 'bg-teal-50 dark:bg-teal-950/45',
    textColor: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-500 text-teal-800 dark:border-teal-400 dark:text-teal-200',
  },
  offered: {
    label: 'Offered',
    emoji: '🏆',
    color: 'emerald',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/45',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-500 text-emerald-800 dark:border-emerald-400 dark:text-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    emoji: '❌',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-950/45',
    textColor: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-500 text-red-800 dark:border-red-400 dark:text-red-200',
  },
  withdrawn: {
    label: 'Withdrawn',
    emoji: '🚪',
    color: 'gray',
    bgColor: 'bg-gray-50 dark:bg-gray-900/55',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderClass: 'border-gray-400 text-gray-800 dark:border-gray-500 dark:text-gray-200',
  },
  ghosted: {
    label: 'Ghosted',
    emoji: '👻',
    color: 'slate',
    bgColor: 'bg-slate-50 dark:bg-slate-900/55',
    textColor: 'text-slate-600 dark:text-slate-300',
    borderClass: 'border-slate-400 text-slate-700 dark:border-slate-500 dark:text-slate-200',
  },
};

/** Short label with emoji — buttons and toasts */
export function jobStatusShortLabel(s: JobStatus): string {
  if (s === 'none') return 'Track Job';
  const c = JOB_STATUS_CONFIG[s];
  return `${c.emoji} ${c.label}`;
}

/** Diff viewer — section model */
export interface CVSection {
  name: string;
  items: CVSectionItem[];
}

export interface CVSectionItem {
  title?: string;
  subtitle?: string;
  bullets: string[];
  dateRange?: string;
}

export interface CVDiffSection {
  sectionName: string;
  changes: CVDiffChange[];
  hasChanges: boolean;
}

export interface CVDiffChange {
  type: 'removed' | 'added' | 'unchanged';
  content: string;
}

export type WorkType = 'remote' | 'hybrid' | 'onsite';
export type Priority = 'low' | 'medium' | 'high';
export type TemplateType = 'cv' | 'cover_letter';

// Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  trial_ends_at: string | null;
  is_onboarded: boolean;
  /** Default cover letter template id (see migration 011 on `profiles`) */
  preferred_cl_template_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Generic labeled hyperlink — used by ProjectEntry, CertificationEntry, etc.
export interface EntryLink {
  label: string; // e.g. "GitHub", "Live Demo", "Credential", "Slides"
  url: string;
}

// Profile-level extra link (beyond the dedicated linkedin / github fields)
export interface ProfileLink {
  id: string;
  label: string; // e.g. "Portfolio", "Behance", "Blog", "npm", "Twitter"
  url: string;
}

// CV sub-types (stored as JSONB)
export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location: string;
  start_date: string; // YYYY-MM
  end_date: string | null; // null = current
  is_current: boolean;
  bullets: string[]; // max 8
  description: string | null;
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string; // "Bachelor's" | "Master's" | "PhD" | "Diploma" | "Certificate" | "Other"
  field_of_study: string;
  start_date: string;
  end_date: string | null;
  gpa: string | null;
  description: string | null;
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  tech_stack: string[];
  /** Primary multi-link list. Replaces the legacy single `url` field. */
  links: EntryLink[];
  /** @deprecated Use `links`. Kept for backward-compat with old JSONB data. */
  url?: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  /** Primary multi-link list. Replaces the legacy single `url` field. */
  links: EntryLink[];
  /** @deprecated Use `links`. Kept for backward-compat with old JSONB data. */
  url?: string | null;
}

export interface LanguageEntry {
  id: string;
  language: string;
  proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
}

export interface AwardEntry {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string | null;
}

/** Professional reference (max 2 stored in profile). */
export interface ReferralEntry {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
}

/** Which CV blocks appear on exported PDF/HTML. Omitted or true = show; false = hide. */
export type CVSectionVisibilityKey =
  | 'photo'
  | 'address'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'languages'
  | 'certifications'
  | 'awards'
  | 'referrals'
  | 'publications'
  | 'research'
  | 'volunteer'
  | 'interests'
  | 'custom';

export type CVSectionVisibility = Partial<
  Record<CVSectionVisibilityKey, boolean>
>;

export type {
  CVData,
  TemplateId,
  CVMeta,
  PersonalInfo,
  WorkExperience,
  Education,
  SkillCategory,
  SkillItem,
  SkillRating,
  Project,
  Publication,
  Research,
  Certification,
  Award,
  Volunteer,
  Language,
  Reference,
  CustomSection,
} from '../src/types/cv.types';

export { SKILL_RATING_LABEL, SKILL_RATING_PCT } from '../src/types/cv.types';

// CV Profile (editor + PDF — JSONB arrays use app shapes: SkillCategory[], etc.)
export interface CVProfile {
  id: string;
  user_id: string;
  /** Display name for this CV version */
  name: string;
  full_name: string | null;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  /** Extra labeled links (portfolio, website, Behance, etc.) beyond linkedin/github. */
  links: ProfileLink[];
  /** @deprecated Use `links`. Kept for backward-compat. */
  portfolio_url?: string | null;
  /** @deprecated Use `links`. Kept for backward-compat. */
  website_url?: string | null;
  address?: string | null;
  photo_url?: string | null;
  summary: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: import('../src/types/cv.types').SkillCategory[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  awards: AwardEntry[];
  referrals?: ReferralEntry[];
  section_visibility?: CVSectionVisibility;
  /** Publications, research, volunteer, interests, custom blocks (see `lib/cv-universal-bridge.ts`). */
  cv_extra?: Record<string, unknown>;
  is_complete: boolean;
  completion_percentage: number;
  original_cv_file_url: string | null;
  preferred_template_id: string;
  font_family?: string;
  accent_color?: string;
  /** Not stored on `cvs`; optional hint from extract / profile for cover letter defaults */
  preferred_cl_template_id?: string;
  job_ids?: string[];
  ai_changes_summary?: string | null;
  keywords_added?: string[];
  bullets_improved?: number;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

/** @deprecated Alias for Job — use Job */
export type JobApplication = import('./database').Job;

// CV Template
export interface CVTemplate {
  id: string;
  type: TemplateType;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  category: string;
  is_premium: boolean;
  available_tiers: SubscriptionTier[];
  sort_order: number;
}

// Payment
export interface Payment {
  id: string;
  user_id: string;
  tran_id: string;
  val_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  plan: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  gateway_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Tier limits
export const TIER_LIMITS: Record<
  SubscriptionTier,
  {
    generationsPerMonth: number;
    cvUploads: number;
    trackerAccess: boolean;
    atsAccess: boolean;
    aiExtrasAccess: boolean;
  }
> = {
  free: {
    generationsPerMonth: 3,
    cvUploads: 1,
    trackerAccess: false,
    atsAccess: false,
    aiExtrasAccess: false,
  },
  pro: {
    generationsPerMonth: 30,
    cvUploads: Infinity,
    trackerAccess: true,
    atsAccess: true,
    aiExtrasAccess: true,
  },
  premium: {
    generationsPerMonth: 100,
    cvUploads: Infinity,
    trackerAccess: true,
    atsAccess: true,
    aiExtrasAccess: true,
  },
  career: {
    generationsPerMonth: Infinity,
    cvUploads: Infinity,
    trackerAccess: true,
    atsAccess: true,
    aiExtrasAccess: true,
  },
};

// Pricing
export const PRICING = {
  pro_monthly: {
    amount: 9.99,
    period: 'monthly' as const,
    tier: 'pro' as SubscriptionTier,
    days: 30,
  },
  pro_yearly: {
    amount: 89.99,
    period: 'yearly' as const,
    tier: 'pro' as SubscriptionTier,
    days: 365,
  },
  premium_monthly: {
    amount: 19.99,
    period: 'monthly' as const,
    tier: 'premium' as SubscriptionTier,
    days: 30,
  },
  premium_yearly: {
    amount: 179.99,
    period: 'yearly' as const,
    tier: 'premium' as SubscriptionTier,
    days: 365,
  },
  career_monthly: {
    amount: 29.99,
    period: 'monthly' as const,
    tier: 'career' as SubscriptionTier,
    days: 30,
  },
  career_yearly: {
    amount: 269.99,
    period: 'yearly' as const,
    tier: 'career' as SubscriptionTier,
    days: 365,
  },
};

export type PricingPlanKey = keyof typeof PRICING;

/** In-memory draft after AI optimise — not persisted until the user saves */
export interface DraftOptimisedCV {
  cvContent: string;
  originalCvId: string;
  jobDescription: string;
  jobUrl: string | null;
  extractedKeywords: string[];
  jobTitle: string | null;
  companyName: string | null;
  generatedAt: Date;
  /** Optional extras for UI (not required for persistence) */
  aiChangesSummary?: string;
  bulletsImproved?: number;
  warnings?: string[];
}

/** Tailored CV row (`cvs` with non-empty `job_ids`) plus joined job context for UI */
export type JobSpecificCV = Omit<CVProfile, 'preferred_template_id'> & {
  preferred_template_id: string | null;
  job_title: string;
  company_name: string | null;
  /** Derived from stored job keywords (full JD is never stored) */
  job_description: string;
  accent_color: string;
};
