/**
 * Supabase table types — authoritative shapes for `cvs`, `jobs`, `cover_letters`.
 * JSONB columns may still contain legacy shapes at runtime; normalize at boundaries.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface CVExperience {
  id: string;
  company: string;
  title: string;
  location?: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  description: string;
  bullets: string[];
}

export interface CVEducation {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  description?: string;
  grade?: string;
}

export interface CVSkill {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category?: string;
}

export interface CVProject {
  id: string;
  name: string;
  description: string;
  url?: string;
  technologies?: string[];
  start_date?: string;
  end_date?: string;
}

export interface CVCertification {
  id: string;
  name: string;
  issuer: string;
  date?: string;
  expiry_date?: string;
  url?: string;
}

export interface CVLanguage {
  id: string;
  language: string;
  proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

export interface CVAward {
  id: string;
  title: string;
  issuer: string;
  date?: string;
  description?: string;
}

export interface CVReferral {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

export interface CVLink {
  id: string;
  label: string;
  url: string;
}

export interface CV {
  id: string;
  user_id: string;
  name: string;
  full_name: string | null;
  professional_title: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  address: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  links: CVLink[];
  summary: string | null;
  experience: CVExperience[];
  education: CVEducation[];
  skills: CVSkill[];
  projects: CVProject[];
  certifications: CVCertification[];
  languages: CVLanguage[];
  awards: CVAward[];
  referrals: CVReferral[];
  section_visibility: Record<string, boolean>;
  preferred_template_id: string;
  font_family: string;
  accent_color: string;
  job_ids: string[];
  ai_changes_summary: string | null;
  keywords_added: string[];
  bullets_improved: number;
  original_cv_file_url: string | null;
  is_complete: boolean;
  completion_percentage: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type CVInsert = Pick<CV, 'name'> &
  Partial<Omit<CV, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type CVUpdate = Partial<Omit<CV, 'id' | 'user_id' | 'created_at'>>;

export function isJobSpecificCV(cv: CV): boolean {
  return cv.job_ids.length > 0;
}

export type JobStatus =
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

export interface Job {
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
  work_type: 'remote' | 'hybrid' | 'onsite' | null;
  status: JobStatus;
  saved_at: string | null;
  applied_at: string | null;
  interview_at: string | null;
  offer_at: string | null;
  deadline: string | null;
  notes: string | null;
  contact_name: string | null;
  contact_email: string | null;
  priority: string;
  is_starred: boolean;
  created_at: string;
  updated_at: string;
}

export type JobInsert = Pick<Job, 'company_name' | 'job_title'> &
  Partial<Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type JobUpdate = Partial<Omit<Job, 'id' | 'user_id' | 'created_at'>>;

export interface CoverLetter {
  id: string;
  user_id: string;
  name: string;
  tone: string | null;
  length: string | null;
  specific_emphasis: string | null;
  content: string | null;
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
  job_ids: string[];
  applicant_name: string | null;
  applicant_role: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_location: string | null;
  created_at: string;
  updated_at: string;
}

export type CoverLetterInsert = Pick<CoverLetter, 'name'> &
  Partial<Omit<CoverLetter, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type CoverLetterUpdate = Partial<Omit<CoverLetter, 'id' | 'user_id' | 'created_at'>>;
