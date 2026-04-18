import type { CVData } from '@/types';
import {
  cvDataToFormSlices,
  entryToCert,
  entryToEdu,
  entryToLang,
  entryToProj,
  expToWork,
  referralToRef,
  type FormSlices,
} from '@/lib/cv-form-slices';

function buildPersonalFromMergedSlices(slices: FormSlices): CVData['personal'] {
  return {
    fullName: slices.full_name,
    title: slices.professional_title,
    email: slices.email,
    phone: slices.phone,
    location: slices.location,
    photo: slices.photo_url || undefined,
    links: {
      linkedin: slices.linkedin_url || undefined,
      github: slices.github_url || undefined,
      portfolio: slices.links.find((l) => l.label.toLowerCase().includes('portfolio'))?.url,
      behance: slices.links.find((l) => l.label.toLowerCase().includes('behance'))?.url,
      dribbble: slices.links.find((l) => l.label.toLowerCase().includes('dribbble'))?.url,
      website: slices.links.find(
        (l) =>
          l.label.toLowerCase().includes('website') || l.label.toLowerCase().includes('blog')
      )?.url,
      orcid: slices.links.find((l) => l.label.toLowerCase().includes('orcid'))?.url,
      googleScholar: slices.links.find((l) => l.label.toLowerCase().includes('scholar'))?.url,
      researchGate: slices.links.find((l) => l.label.toLowerCase().includes('researchgate'))?.url,
    },
  };
}

/**
 * Applies only the fields present in `patch`, reusing unchanged branches from `prev`
 * so Zustand subscribers to e.g. `experience` do not re-render when only `summary` changes.
 */
export function patchCvDataFromPartialFormSlices(
  prev: CVData,
  patch: Partial<FormSlices>
): CVData {
  const base = cvDataToFormSlices(prev);
  const merged: FormSlices = { ...base, ...patch };

  let next: CVData = prev;

  const personalTouch =
    patch.full_name !== undefined ||
    patch.professional_title !== undefined ||
    patch.email !== undefined ||
    patch.phone !== undefined ||
    patch.location !== undefined ||
    patch.linkedin_url !== undefined ||
    patch.github_url !== undefined ||
    patch.links !== undefined ||
    patch.photo_url !== undefined;

  if (personalTouch) {
    next = { ...next, personal: buildPersonalFromMergedSlices(merged) };
  }

  if (patch.address !== undefined) {
    next = { ...next, postalAddress: merged.address || undefined };
  }

  if (patch.summary !== undefined) {
    next = { ...next, summary: merged.summary };
  }

  if (patch.section_visibility !== undefined) {
    next = { ...next, sectionVisibility: merged.section_visibility as CVData['sectionVisibility'] };
  }

  if (patch.experience !== undefined) {
    next = { ...next, experience: merged.experience.map(expToWork) };
  }

  if (patch.education !== undefined) {
    next = { ...next, education: merged.education.map(entryToEdu) };
  }

  if (patch.skills !== undefined) {
    next = {
      ...next,
      skills: merged.skills.map((s, i) => ({
        ...s,
        displayOrder: typeof s.displayOrder === 'number' ? s.displayOrder : i,
      })),
    };
  }

  if (patch.projects !== undefined) {
    next = { ...next, projects: merged.projects.map(entryToProj) };
  }

  if (patch.publications !== undefined) {
    next = { ...next, publications: merged.publications };
  }

  if (patch.research !== undefined) {
    next = { ...next, research: merged.research };
  }

  if (patch.volunteer !== undefined) {
    next = { ...next, volunteer: merged.volunteer };
  }

  if (patch.languages !== undefined) {
    next = { ...next, languages: merged.languages.map(entryToLang) };
  }

  if (patch.certifications !== undefined) {
    next = { ...next, certifications: merged.certifications.map(entryToCert) };
  }

  if (patch.referrals !== undefined) {
    next = { ...next, references: merged.referrals.map(referralToRef) };
  }

  if (patch.awards !== undefined) {
    next = {
      ...next,
      awards: merged.awards.map((a) => ({
        id: a.id,
        title: a.title,
        issuer: a.issuer,
        date: a.date,
        description: a.description ?? undefined,
      })),
    };
  }

  if (patch.interestsText !== undefined) {
    next = {
      ...next,
      interests: merged.interestsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
  }

  if (patch.custom !== undefined) {
    next = { ...next, custom: merged.custom };
  }

  return next;
}
