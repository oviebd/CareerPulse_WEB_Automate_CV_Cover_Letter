import { create } from 'zustand';
import type { CoverLetterLength, CoverLetterTone } from '@/types';

/** Passed from optimise result → job-specific CV editor when nothing is saved yet (Zustand, no URL/localStorage). */
export interface CvOptimiseEditDraft {
  cvContent: string;
  originalCvId: string;
  jobTitle?: string | null;
  companyName?: string | null;
  savedJobId?: string | null;
  aiChangesSummary?: string | null;
  extractedKeywords?: string[];
  bulletsImproved?: number;
}

/** Passed from optimise result → cover letter editor when nothing is saved yet. */
export interface CoverLetterOptimiseEditDraft {
  content: string;
  originalCvId: string;
  companyName?: string | null;
  jobTitle?: string | null;
  tone?: CoverLetterTone;
  length?: CoverLetterLength;
  emphasis?: string | null;
  templateId?: string | null;
  savedJobId?: string | null;
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
