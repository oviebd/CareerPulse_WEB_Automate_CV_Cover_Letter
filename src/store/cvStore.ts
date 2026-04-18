'use client';

import { create } from 'zustand';
import type { CVData, CustomSection, Publication, Reference, SkillCategory } from '@/types';
import type { CVMeta } from '@/src/types/cv.types';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { patchCvDataFromPartialFormSlices } from '@/lib/patch-cv-form-slices';
import type { FormSlices } from '@/lib/cv-form-slices';

export interface CVDocumentEditorState {
  cvData: CVData | null;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
  isDirty: boolean;
  isSaving: boolean;
  isGeneratingPdf: boolean;

  setMeta: (meta: Partial<CVMeta>) => void;
  setPersonal: (personal: Partial<CVData['personal']>) => void;
  setSummary: (summary: string) => void;
  setExperience: (experience: CVData['experience']) => void;
  setEducation: (education: CVData['education']) => void;
  setSkills: (skills: SkillCategory[]) => void;
  setProjects: (projects: CVData['projects']) => void;
  setPublications: (publications: Publication[]) => void;
  setResearch: (research: CVData['research']) => void;
  setCertifications: (certifications: CVData['certifications']) => void;
  setAwards: (awards: CVData['awards']) => void;
  setVolunteer: (volunteer: CVData['volunteer']) => void;
  setLanguages: (languages: CVData['languages']) => void;
  setInterests: (interests: string[]) => void;
  setReferences: (references: Reference[]) => void;
  setCustom: (custom: CustomSection[]) => void;
  setSectionVisibility: (sectionVisibility: NonNullable<CVData['sectionVisibility']>) => void;
  setPostalAddress: (postalAddress: string | undefined) => void;

  setName: (name: string) => void;
  setPreferredTemplateId: (id: string) => void;
  setAccentColor: (v: string) => void;
  setFontFamily: (v: string) => void;

  /** Full replace (undo/redo, load) — marks dirty unless `pristine` */
  setCvData: (data: CVData, options?: { pristine?: boolean }) => void;
  applyFormSlicesPatch: (patch: Partial<FormSlices>) => void;

  markPristine: () => void;
  markDirty: () => void;
  setIsSaving: (v: boolean) => void;
  setIsGeneratingPdf: (v: boolean) => void;

  hydrate: (partial: Partial<Pick<CVDocumentEditorState, 'cvData' | 'name' | 'preferred_template_id' | 'accent_color' | 'font_family'>> & { isDirty?: boolean }) => void;
  reset: () => void;
}

const empty = () => createEmptyCVData('classic');

const initial: Omit<
  CVDocumentEditorState,
  | keyof Pick<
      CVDocumentEditorState,
      | 'setMeta'
      | 'setPersonal'
      | 'setSummary'
      | 'setExperience'
      | 'setEducation'
      | 'setSkills'
      | 'setProjects'
      | 'setPublications'
      | 'setResearch'
      | 'setCertifications'
      | 'setAwards'
      | 'setVolunteer'
      | 'setLanguages'
      | 'setInterests'
      | 'setReferences'
      | 'setCustom'
      | 'setSectionVisibility'
      | 'setPostalAddress'
      | 'setName'
      | 'setPreferredTemplateId'
      | 'setAccentColor'
      | 'setFontFamily'
      | 'setCvData'
      | 'applyFormSlicesPatch'
      | 'markPristine'
      | 'markDirty'
      | 'setIsSaving'
      | 'setIsGeneratingPdf'
      | 'hydrate'
      | 'reset'
    >
> = {
  cvData: empty(),
  name: 'Untitled CV',
  preferred_template_id: 'classic',
  accent_color: '#6C63FF',
  font_family: 'Inter',
  isDirty: true,
  isSaving: false,
  isGeneratingPdf: false,
};

export const useCVDocumentStore = create<CVDocumentEditorState>((set, get) => ({
  ...initial,

  setMeta: (meta) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, meta: { ...s.cvData.meta, ...meta } } : s.cvData,
      isDirty: true,
    })),

  setPersonal: (personal) =>
    set((s) => ({
      cvData: s.cvData
        ? { ...s.cvData, personal: { ...s.cvData.personal, ...personal } }
        : s.cvData,
      isDirty: true,
    })),

  setSummary: (summary) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, summary } : s.cvData,
      isDirty: true,
    })),

  setExperience: (experience) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, experience } : s.cvData,
      isDirty: true,
    })),

  setEducation: (education) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, education } : s.cvData,
      isDirty: true,
    })),

  setSkills: (skills) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, skills } : s.cvData,
      isDirty: true,
    })),

  setProjects: (projects) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, projects } : s.cvData,
      isDirty: true,
    })),

  setPublications: (publications) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, publications } : s.cvData,
      isDirty: true,
    })),

  setResearch: (research) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, research } : s.cvData,
      isDirty: true,
    })),

  setCertifications: (certifications) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, certifications } : s.cvData,
      isDirty: true,
    })),

  setAwards: (awards) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, awards } : s.cvData,
      isDirty: true,
    })),

  setVolunteer: (volunteer) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, volunteer } : s.cvData,
      isDirty: true,
    })),

  setLanguages: (languages) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, languages } : s.cvData,
      isDirty: true,
    })),

  setInterests: (interests) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, interests } : s.cvData,
      isDirty: true,
    })),

  setReferences: (references) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, references } : s.cvData,
      isDirty: true,
    })),

  setCustom: (custom) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, custom } : s.cvData,
      isDirty: true,
    })),

  setSectionVisibility: (sectionVisibility) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, sectionVisibility } : s.cvData,
      isDirty: true,
    })),

  setPostalAddress: (postalAddress) =>
    set((s) => ({
      cvData: s.cvData ? { ...s.cvData, postalAddress } : s.cvData,
      isDirty: true,
    })),

  setName: (name) => set({ name, isDirty: true }),

  setPreferredTemplateId: (preferred_template_id) => set({ preferred_template_id, isDirty: true }),

  setAccentColor: (accent_color) => set({ accent_color, isDirty: true }),

  setFontFamily: (font_family) => set({ font_family, isDirty: true }),

  setCvData: (data, options) =>
    set({
      cvData: data,
      isDirty: options?.pristine ? false : true,
    }),

  applyFormSlicesPatch: (patch) => {
    const prev = get().cvData;
    if (!prev) return;
    const next = patchCvDataFromPartialFormSlices(prev, patch);
    set({ cvData: next, isDirty: true });
  },

  markPristine: () => set({ isDirty: false }),

  markDirty: () => set({ isDirty: true }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setIsGeneratingPdf: (isGeneratingPdf) => set({ isGeneratingPdf }),

  hydrate: (partial) =>
    set((s) => ({
      ...s,
      ...partial,
      cvData: partial.cvData ?? s.cvData,
      name: partial.name ?? s.name,
      preferred_template_id: partial.preferred_template_id ?? s.preferred_template_id,
      accent_color: partial.accent_color ?? s.accent_color,
      font_family: partial.font_family ?? s.font_family,
      isDirty: partial.isDirty ?? s.isDirty,
    })),

  reset: () => set({ ...initial, cvData: empty() }),
}));

export const useCvPersonal = () => useCVDocumentStore((s) => s.cvData?.personal);
export const useCvSummary = () => useCVDocumentStore((s) => s.cvData?.summary);
export const useCvExperience = () => useCVDocumentStore((s) => s.cvData?.experience);
export const useCvEducation = () => useCVDocumentStore((s) => s.cvData?.education);
export const useCvSkills = () => useCVDocumentStore((s) => s.cvData?.skills);
export const useCvProjects = () => useCVDocumentStore((s) => s.cvData?.projects);
export const useCvPublications = () => useCVDocumentStore((s) => s.cvData?.publications);
export const useCvResearch = () => useCVDocumentStore((s) => s.cvData?.research);
export const useCvCertifications = () => useCVDocumentStore((s) => s.cvData?.certifications);
export const useCvAwards = () => useCVDocumentStore((s) => s.cvData?.awards);
export const useCvVolunteer = () => useCVDocumentStore((s) => s.cvData?.volunteer);
export const useCvLanguages = () => useCVDocumentStore((s) => s.cvData?.languages);
export const useCvInterests = () => useCVDocumentStore((s) => s.cvData?.interests);
export const useCvReferences = () => useCVDocumentStore((s) => s.cvData?.references);
export const useCvCustom = () => useCVDocumentStore((s) => s.cvData?.custom);
export const useCvMeta = () => useCVDocumentStore((s) => s.cvData?.meta);
export const useCvSectionVisibility = () => useCVDocumentStore((s) => s.cvData?.sectionVisibility);
export const useCvPostalAddress = () => useCVDocumentStore((s) => s.cvData?.postalAddress);
export const useCvDocumentName = () => useCVDocumentStore((s) => s.name);
export const useCvPreferredTemplateId = () => useCVDocumentStore((s) => s.preferred_template_id);
export const useCvAccentColor = () => useCVDocumentStore((s) => s.accent_color);
export const useCvFontFamily = () => useCVDocumentStore((s) => s.font_family);
export const useCvIsSaving = () => useCVDocumentStore((s) => s.isSaving);
export const useCvIsGeneratingPdf = () => useCVDocumentStore((s) => s.isGeneratingPdf);
export const useCvIsDirty = () => useCVDocumentStore((s) => s.isDirty);
export const useCvData = () => useCVDocumentStore((s) => s.cvData);
