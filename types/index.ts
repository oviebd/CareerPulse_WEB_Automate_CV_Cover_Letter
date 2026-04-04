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
} from './database';

export type { CVUpdate, CVInsert, JobInsert, JobUpdate, CoverLetterUpdate } from './database';

/** @deprecated Use JobStatus from ./database */
export type ApplicationStatus = import('./database').JobStatus;

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

export interface SkillGroup {
  id: string;
  category: 'technical' | 'soft' | 'languages' | 'tools';
  items: string[];
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
  | 'referrals';

export type CVSectionVisibility = Partial<
  Record<CVSectionVisibilityKey, boolean>
>;

/** Shape passed to CV HTML templates and PDF rendering (JSONB fields normalized). */
export interface CVData {
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
  /** Used only for PDF/HTML preview rendering to include/exclude CV sections. */
  section_visibility?: CVSectionVisibility;
  /** Full postal / mailing address (separate from short location line). */
  address: string | null;
  /** Public URL to profile photo (e.g. Supabase Storage). */
  photo_url: string | null;
  summary: string | null;
  experience: Array<{
    id: string;
    company: string;
    title: string;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    bullets: string[];
    description: string | null;
  }>;
  education: Array<{
    id: string;
    institution: string;
    degree: string | null;
    field_of_study: string | null;
    start_date: string | null;
    end_date: string | null;
    gpa: string | null;
    description: string | null;
  }>;
  skills: Array<{
    id: string;
    category: 'technical' | 'soft' | 'tools' | 'languages';
    items: string[];
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string | null;
    tech_stack: string[];
    links: EntryLink[];
    url?: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    links: EntryLink[];
    url?: string | null;
  }>;
  languages: Array<{
    id: string;
    language: string;
    proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
  }>;
  awards: Array<{
    id: string;
    title: string;
    issuer: string | null;
    date: string | null;
    description: string | null;
  }>;
  referrals: ReferralEntry[];
  accent_color?: string;
  font_family?: string;
  watermark?: boolean;
  /** Precomputed in renderTemplate for pipe-separated contact (optional). */
  contact_line?: string;
}

// CV Profile (editor + PDF — JSONB arrays use app shapes: SkillGroup, etc.)
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
  skills: SkillGroup[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  awards: AwardEntry[];
  referrals?: ReferralEntry[];
  section_visibility?: CVSectionVisibility;
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

/** Tailored CV row (`cvs` with non-empty `job_ids`) plus joined job context for UI */
export type JobSpecificCV = Omit<CVProfile, 'preferred_template_id'> & {
  preferred_template_id: string | null;
  job_title: string;
  company_name: string | null;
  job_description: string;
  accent_color: string;
};
