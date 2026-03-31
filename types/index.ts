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
export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'phone_screen'
  | 'interview'
  | 'technical'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn';
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
  created_at: string;
  updated_at: string;
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
  url: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  url: string | null;
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
  portfolio_url: string | null;
  website_url: string | null;
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
    url: string | null;
    start_date: string | null;
    end_date: string | null;
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    url: string | null;
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
  watermark?: boolean;
  /** Precomputed in renderTemplate for pipe-separated contact (optional). */
  contact_line?: string;
}

// CV Profile
export interface CVProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
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
  preferred_cv_template_id: string;
  preferred_cl_template_id: string;
  created_at: string;
  updated_at: string;
}

// Cover Letter
export interface CoverLetter {
  id: string;
  user_id: string;
  job_title: string | null;
  company_name: string | null;
  applicant_name: string | null;
  applicant_role: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_location: string | null;
  job_description: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  specific_emphasis: string | null;
  content: string;
  ats_score: number | null;
  ats_keywords_found: string[];
  ats_keywords_missing: string[];
  ats_summary: string | null;
  template_id: string;
  pdf_url: string | null;
  docx_url: string | null;
  share_token: string | null;
  is_favourited: boolean;
  generation_model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  job_application_id: string | null;
  created_at: string;
  updated_at: string;
}

// Job Application
export interface JobApplication {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  job_url: string | null;
  job_description: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  work_type: WorkType | null;
  status: ApplicationStatus;
  saved_at: string;
  applied_at: string | null;
  interview_at: string | null;
  offer_at: string | null;
  deadline: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  priority: Priority;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

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

// Job-specific CV (tailored snapshot for a particular role)
export interface JobSpecificCV {
  id: string;
  user_id: string;

  job_title: string;
  company_name: string | null;
  job_description: string;

  full_name: string | null;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  website_url: string | null;
  summary: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  awards: AwardEntry[];

  ai_changes_summary: string | null;
  keywords_added: string[];
  bullets_improved: number;

  preferred_template_id: string | null;
  accent_color: string;

  is_archived: boolean;
  job_application_id: string | null;

  created_at: string;
  updated_at: string;
}
