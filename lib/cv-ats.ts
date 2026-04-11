import type { CVData } from '@/types';

export interface ATSSectionFeedback {
  score: number;
  suggestions: string[];
}

export interface ATSReport {
  score: number;
  summary: string;
  suggestions: string[];
  sections: Record<string, ATSSectionFeedback>;
}

const ACTION_VERBS = [
  'led',
  'built',
  'created',
  'designed',
  'developed',
  'implemented',
  'improved',
  'optimized',
  'delivered',
  'launched',
  'managed',
  'increased',
  'reduced',
];

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
}

function countKeywordHits(text: string, keywords: string[]): number {
  if (!keywords.length) return 0;
  const hay = text.toLowerCase();
  return keywords.reduce((count, kw) => (hay.includes(kw.toLowerCase()) ? count + 1 : count), 0);
}

function getBand(score: number): string {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'needs work';
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function skillItemLabel(it: { name: string } | string): string {
  return typeof it === 'string' ? it : it.name;
}

export function buildATSReport(cv: CVData, highlightedKeywords: string[] = []): ATSReport {
  const sections: Record<string, ATSSectionFeedback> = {};
  const p = cv.personal;

  const headerSuggestions: string[] = [];
  let headerScore = 0;
  if ((p?.fullName ?? '').trim()) headerScore += 4;
  else headerSuggestions.push('Add your full name.');
  if ((p?.title ?? '').trim()) headerScore += 4;
  else headerSuggestions.push('Add a role-focused professional title.');
  if ((p?.email ?? '').trim()) headerScore += 4;
  else headerSuggestions.push('Add an email so recruiters can contact you quickly.');
  if ((p?.phone ?? '').trim()) headerScore += 4;
  else headerSuggestions.push('Add a phone number in your header.');
  if ((p?.location ?? '').trim()) headerScore += 4;
  else headerSuggestions.push('Add your city/location for ATS and recruiter filtering.');
  sections.header = { score: clamp((headerScore / 20) * 100), suggestions: headerSuggestions };

  const summaryText = (cv.summary ?? '').trim();
  const summarySuggestions: string[] = [];
  let summaryScore = 0;
  if (summaryText.length >= 80) summaryScore += 40;
  else summarySuggestions.push('Expand summary to at least 2-3 lines with your niche and strengths.');
  if (summaryText.length <= 550) summaryScore += 20;
  else summarySuggestions.push('Shorten summary for better ATS readability.');
  if (/\d/.test(summaryText)) summaryScore += 20;
  else summarySuggestions.push('Add one measurable result in summary (for example %, revenue, users).');
  const summaryKeywordHits = countKeywordHits(summaryText, highlightedKeywords);
  if (!highlightedKeywords.length || summaryKeywordHits > 0) summaryScore += 20;
  else summarySuggestions.push('Include 1-2 target job keywords in your summary naturally.');
  sections.summary = { score: clamp(summaryScore), suggestions: summarySuggestions };

  const experience = cv.experience ?? [];
  const experienceSuggestions: string[] = [];
  let experienceScore = 0;
  if (experience.length > 0) experienceScore += 25;
  else experienceSuggestions.push('Add at least one experience entry.');
  const bullets = experience.flatMap((ex) => ex.bullets ?? []);
  if (bullets.length >= 4) experienceScore += 20;
  else experienceSuggestions.push('Add more bullet points across experience (aim 4+ total).');
  const bulletsWithMetrics = bullets.filter((b) => /\d/.test(b)).length;
  if (bullets.length && bulletsWithMetrics / Math.max(1, bullets.length) >= 0.4) experienceScore += 20;
  else experienceSuggestions.push('Add measurable impact to more bullets (numbers, %, time, scale).');
  const bulletsWithAction = bullets.filter((b) =>
    ACTION_VERBS.some((verb) => b.toLowerCase().includes(verb))
  ).length;
  if (bullets.length && bulletsWithAction / Math.max(1, bullets.length) >= 0.5) experienceScore += 20;
  else experienceSuggestions.push('Start bullets with stronger action verbs (Led, Built, Improved, etc.).');
  const experienceText = bullets.join(' ');
  const experienceKeywordHits = countKeywordHits(experienceText, highlightedKeywords);
  if (!highlightedKeywords.length || experienceKeywordHits >= Math.min(3, highlightedKeywords.length)) {
    experienceScore += 15;
  } else {
    experienceSuggestions.push('Reflect more target keywords in relevant experience bullets.');
  }
  sections.experience = { score: clamp(experienceScore), suggestions: experienceSuggestions };

  const skillGroups = cv.skills ?? [];
  const skillItems = skillGroups.flatMap((g) => (g.items ?? []).map(skillItemLabel));
  const skillsSuggestions: string[] = [];
  let skillsScore = 0;
  if (skillItems.length >= 8) skillsScore += 45;
  else skillsSuggestions.push('Add more role-relevant skills (aim for 8-15 total).');
  if (skillGroups.length >= 2) skillsScore += 20;
  else skillsSuggestions.push('Use at least 2 skill groups (e.g. technical and tools).');
  const skillKeywordHits = countKeywordHits(skillItems.join(' '), highlightedKeywords);
  if (!highlightedKeywords.length || skillKeywordHits >= Math.min(4, highlightedKeywords.length)) {
    skillsScore += 35;
  } else {
    skillsSuggestions.push('Add missing target keywords to skills when you have real experience in them.');
  }
  sections.skills = { score: clamp(skillsScore), suggestions: skillsSuggestions };

  const educationSuggestions: string[] = [];
  let educationScore = 0;
  if ((cv.education ?? []).length > 0) educationScore += 60;
  else educationSuggestions.push('Add at least one education entry.');
  if ((cv.education ?? []).some((e) => (e.field ?? '').trim())) educationScore += 20;
  else educationSuggestions.push('Add field of study to improve keyword relevance.');
  if (
    (cv.education ?? []).some((e) => (e.startDate ?? '').trim() || (e.endDate ?? '').trim())
  ) {
    educationScore += 20;
  } else {
    educationSuggestions.push('Add education dates for timeline completeness.');
  }
  sections.education = { score: clamp(educationScore), suggestions: educationSuggestions };

  const projectSuggestions: string[] = [];
  let projectsScore = 0;
  const projects = cv.projects ?? [];
  if (projects.length > 0) projectsScore += 40;
  else projectSuggestions.push('Add a project section if you have relevant portfolio work.');
  if (projects.some((p) => (p.technologies ?? []).length > 0)) projectsScore += 30;
  else projectSuggestions.push('List tech stack in projects so ATS can match tools/technologies.');
  if (projects.some((p) => /\d/.test(p.description ?? ''))) projectsScore += 15;
  else projectSuggestions.push('Add measurable outcomes in project descriptions where possible.');
  if (projects.some((p) => (p.links ?? []).some((l) => l.url?.trim()))) projectsScore += 15;
  else projectSuggestions.push('Add project links for credibility when available.');
  sections.projects = { score: clamp(projectsScore), suggestions: projectSuggestions };

  const weights: Array<[string, number]> = [
    ['header', 20],
    ['summary', 15],
    ['experience', 30],
    ['skills', 20],
    ['education', 10],
    ['projects', 5],
  ];
  const weighted = weights.reduce(
    (acc, [key, weight]) => acc + (sections[key]?.score ?? 0) * (weight / 100),
    0
  );
  const score = clamp(weighted);

  const allSuggestions = [
    ...sections.summary.suggestions,
    ...sections.experience.suggestions,
    ...sections.skills.suggestions,
    ...sections.header.suggestions,
    ...sections.education.suggestions,
    ...sections.projects.suggestions,
  ];

  return {
    score,
    summary: `ATS readiness is ${getBand(score)}.`,
    suggestions: allSuggestions.slice(0, 6),
    sections,
  };
}
