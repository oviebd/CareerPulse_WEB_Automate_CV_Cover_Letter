// src/types/cv.types.ts

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'academic'
  | 'technical'
  | 'minimal'
  | 'creative'
  | 'entry-level'
  | 'healthcare'
  | 'amber-strike'
  | 'midnight-pro'
  | 'golden-hour'
  | 'ocean-slate'
  | 'violet-edge';

export type LayoutType = 'single-column' | 'two-column' | 'sidebar';

export interface CVMeta {
  templateId: TemplateId;
  colorScheme: string;
  fontFamily: string;
  layout: LayoutType;
  pageSize: 'A4' | 'Letter';
  showPhoto: boolean;
  sectionOrder: string[];
}

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  photo?: string;
  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    orcid?: string;
    googleScholar?: string;
    researchGate?: string;
    behance?: string;
    dribbble?: string;
    website?: string;
  };
}

export interface WorkExperience {
  id: string;
  company: string;
  logo?: string;
  role: string;
  type: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  location: string;
  remote: boolean;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
  technologies?: string[];
  highlights?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa?: string;
  thesis?: string;
  advisor?: string;
  coursework?: string[];
  honors?: string[];
}

export type SkillRating = 1 | 2 | 3 | 4 | 5;

export const SKILL_RATING_LABEL: Record<SkillRating, string> = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Professional',
};

export const SKILL_RATING_PCT: Record<SkillRating, number> = {
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
};

export interface SkillItem {
  id: string;
  name: string;
  rating: SkillRating;
}

export interface SkillCategory {
  id: string;
  category: string;
  items: SkillItem[];
  displayOrder: number;
}

export interface Project {
  id: string;
  name: string;
  role: string;
  description: string;
  bullets: string[];
  technologies: string[];
  links: { label: string; url: string }[];
  startDate?: string;
  endDate?: string;
  featured: boolean;
}

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  type: 'journal' | 'conference' | 'book-chapter' | 'preprint' | 'thesis';
  status: 'published' | 'in-press' | 'under-review';
}

export interface Research {
  id: string;
  title: string;
  institution: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  funding?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId?: string;
  url?: string;
  expiry?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Volunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Language {
  name: string;
  proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

export interface Reference {
  name: string;
  role: string;
  company: string;
  email?: string;
  phone?: string;
  relationship: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: {
    heading: string;
    subheading?: string;
    date?: string;
    description?: string;
    bullets?: string[];
  }[];
}

export interface CVData {
  meta: CVMeta;
  personal: PersonalInfo;
  /** Full postal / mailing address (legacy `address` column). */
  postalAddress?: string;
  /** Mirrors DB `section_visibility` — which blocks appear in export/preview. */
  sectionVisibility?: Record<string, boolean | undefined>;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: SkillCategory[];
  projects: Project[];
  publications: Publication[];
  research: Research[];
  certifications: Certification[];
  awards: Award[];
  volunteer: Volunteer[];
  languages: Language[];
  interests: string[];
  references: Reference[];
  custom: CustomSection[];
  /** Free-tier watermark for PDF/preview */
  watermark?: boolean;
}
