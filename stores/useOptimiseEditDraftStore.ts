import { create } from 'zustand';
import type {
  CoverLetterLength,
  CoverLetterTone,
  GenerationType,
  JobAnalysisResult,
} from '@/types';

/** Passed from optimise result → job-specific CV editor when nothing is saved yet (Zustand, no URL/localStorage). */
export interface CvOptimiseEditDraft {
  cvContent: string;
  originalCvId: string;
  jobTitle?: string | null;
  companyName?: string | null;
  savedJobId?: string | null;
  savedCvId?: string | null;
  savedCoverLetterId?: string | null;
  coverLetter?: string;
  generationType?: GenerationType;
  jobDescription?: string;
  jobUrl?: string | null;
  analysis?: JobAnalysisResult | null;
  isTracked?: boolean;
  aiChangesSummary?: string | null;
  extractedKeywords?: string[];
  bulletsImproved?: number;
  coverLetterTone?: CoverLetterTone;
  coverLetterLength?: CoverLetterLength;
  coverLetterEmphasis?: string | null;
}

/** Passed from optimise result or enhance-existing page → cover letter editor when nothing is saved yet. */
export interface CoverLetterOptimiseEditDraft {
  content: string;
  /** CV row id used to pre-populate applicant contact fields. Null for non-CV flows (e.g. enhance-existing, scratch). */
  originalCvId: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  tone?: CoverLetterTone;
  length?: CoverLetterLength;
  emphasis?: string | null;
  templateId?: string | null;
  savedJobId?: string | null;
  sourceType?: 'job_description' | 'existing_cover_letter' | 'scratch' | null;
}

interface OptimiseEditDraftState {
  cvEditDraft: CvOptimiseEditDraft | null;
  setCvEditDraft: (draft: CvOptimiseEditDraft | null) => void;
  clEditDraft: CoverLetterOptimiseEditDraft | null;
  setClEditDraft: (draft: CoverLetterOptimiseEditDraft | null) => void;
}

export const useOptimiseEditDraftStore = create<OptimiseEditDraftState>((set) => ({
  cvEditDraft: null,
  setCvEditDraft: (cvEditDraft) => set({ cvEditDraft }),
  clEditDraft: null,
  setClEditDraft: (clEditDraft) => set({ clEditDraft }),
}));
