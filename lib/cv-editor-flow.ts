import type { CVFormTab } from '@/components/cv/CVFormFields';

export type CvSectionHint = { id: CVFormTab; label: string; hint: string };

/** One-line purpose for every editor tab — sidebar tooltips and section intros. */
export const SECTION_HINTS: Record<CVFormTab, { label: string; hint: string }> = {
  design: {
    label: 'Layout & style',
    hint: 'Choose a template, accent color, and font. Changes show instantly in the live preview.',
  },
  photo: {
    label: 'Photo',
    hint: 'Optional headshot. Turn it off in the sidebar if this template or role should not show a photo.',
  },
  header: {
    label: 'Header',
    hint: 'Name and contact shown at the top of the CV.',
  },
  address: {
    label: 'Address',
    hint: 'Full postal address. Optional — turn it off in the sidebar if you only want city in the header.',
  },
  summary: {
    label: 'Summary',
    hint: 'A short professional intro of who you are and what you want next.',
  },
  experience: {
    label: 'Experience',
    hint: 'Your work history.',
  },
  education: {
    label: 'Education',
    hint: 'Degrees, schools, and relevant coursework.',
  },
  skills: {
    label: 'Skills',
    hint: 'Key skills and tools grouped by category.',
  },
  projects: {
    label: 'Projects',
    hint: 'Notable work or side projects.',
  },
  publications: {
    label: 'Publications',
    hint: 'Papers, articles, or books you have published.',
  },
  research: {
    label: 'Research',
    hint: 'Research roles, labs, and projects.',
  },
  languages: {
    label: 'Languages',
    hint: 'Languages you speak and your level.',
  },
  certifications: {
    label: 'Certifications',
    hint: 'Licences, certificates, and professional credentials.',
  },
  references: {
    label: 'References',
    hint: 'People who can vouch for your work. Often omitted on the PDF.',
  },
  awards: {
    label: 'Awards',
    hint: 'Honours, scholarships, and recognitions.',
  },
  volunteer: {
    label: 'Volunteering',
    hint: 'Unpaid work that shows skills or community involvement.',
  },
  interests: {
    label: 'Interests',
    hint: 'Hobbies or topics that round out your profile.',
  },
  custom: {
    label: 'Custom sections',
    hint: 'Add your own headings for anything the other sections do not cover.',
  },
};

/** Guided core CV section order for first-time users. */
export const CORE_CV_FLOW: CvSectionHint[] = [
  { id: 'header', ...SECTION_HINTS.header },
  { id: 'summary', ...SECTION_HINTS.summary },
  { id: 'experience', ...SECTION_HINTS.experience },
  { id: 'education', ...SECTION_HINTS.education },
  { id: 'skills', ...SECTION_HINTS.skills },
  { id: 'projects', ...SECTION_HINTS.projects },
];

export function nextCoreSectionTab(current: CVFormTab): CVFormTab | null {
  const idx = CORE_CV_FLOW.findIndex((s) => s.id === current);
  if (idx < 0 || idx >= CORE_CV_FLOW.length - 1) return null;
  return CORE_CV_FLOW[idx + 1].id;
}

export function coreSectionMeta(tab: CVFormTab) {
  return CORE_CV_FLOW.find((s) => s.id === tab) ?? null;
}

export function sectionHint(tab: CVFormTab) {
  return SECTION_HINTS[tab];
}
