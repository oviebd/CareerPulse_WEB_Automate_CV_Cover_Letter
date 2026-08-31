import { create } from 'zustand';
import type {
  CoverLetterLength,
  CoverLetterTone,
  GenerationType,
  JobAnalysisResult,
} from '@/types';

const STORAGE_KEY = 'optimise_edit_draft_v1';

/** Passed from optimise result → job-specific CV editor when nothing is saved yet. */
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

type StoredDrafts = {
  cvEditDraft: CvOptimiseEditDraft | null;
  clEditDraft: CoverLetterOptimiseEditDraft | null;
};

function readStored(): StoredDrafts {
  if (typeof window === 'undefined') {
    return { cvEditDraft: null, clEditDraft: null };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { cvEditDraft: null, clEditDraft: null };
    const parsed = JSON.parse(raw) as StoredDrafts;
    return {
      cvEditDraft: parsed?.cvEditDraft ?? null,
      clEditDraft: parsed?.clEditDraft ?? null,
    };
  } catch {
    return { cvEditDraft: null, clEditDraft: null };
  }
}

function writeStored(next: StoredDrafts) {
  if (typeof window === 'undefined') return;
  try {
    if (!next.cvEditDraft && !next.clEditDraft) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

const initial = readStored();

export const useOptimiseEditDraftStore = create<OptimiseEditDraftState>((set, get) => ({
  cvEditDraft: initial.cvEditDraft,
  setCvEditDraft: (cvEditDraft) => {
    writeStored({ cvEditDraft, clEditDraft: get().clEditDraft });
    set({ cvEditDraft });
  },
  clEditDraft: initial.clEditDraft,
  setClEditDraft: (clEditDraft) => {
    writeStored({ cvEditDraft: get().cvEditDraft, clEditDraft });
    set({ clEditDraft });
  },
}));
