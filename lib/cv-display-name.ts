const MONTHS_ABBR = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

/** e.g. `10 jun 26` */
export function formatCvTitleDate(date = new Date()): string {
  const day = date.getDate();
  const month = MONTHS_ABBR[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export const PLACEHOLDER_CV_NAMES = new Set([
  'Untitled CV',
  'Tailored CV',
]);

const GENERIC_CV_NAMES = new Set(['core cv', 'cv', 'master cv', 'my cv']);

export const PLACEHOLDER_CL_NAMES = new Set([
  'Untitled Cover Letter',
  'Uploaded Cover Letter',
]);

export function isPlaceholderCvName(name?: string | null): boolean {
  const t = name?.trim();
  if (!t) return true;
  if (PLACEHOLDER_CV_NAMES.has(t)) return true;
  if (GENERIC_CV_NAMES.has(t.toLowerCase())) return true;
  return false;
}

export function defaultCoreCvDisplayNameFromCreatedAt(
  fullName?: string | null,
  createdAt?: string | Date | null
): string {
  if (createdAt) {
    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (!Number.isNaN(date.getTime())) {
      return defaultCoreCvDisplayName(fullName, date);
    }
  }
  return defaultCoreCvDisplayName(fullName);
}

/** Prefer personal / profile full name when generating a library title. */
export function resolveFullNameForCvTitle(
  personalFullName?: string | null,
  profileFullName?: string | null,
  accountFullName?: string | null
): string | null {
  const candidates = [personalFullName, profileFullName, accountFullName];
  for (const c of candidates) {
    const t = c?.trim();
    if (t && !GENERIC_CV_NAMES.has(t.toLowerCase())) return t;
  }
  return candidates.map((c) => c?.trim()).find(Boolean) ?? null;
}

export function isPlaceholderClName(name?: string | null): boolean {
  const t = name?.trim();
  if (!t) return true;
  return PLACEHOLDER_CL_NAMES.has(t);
}

export function defaultCoreCvDisplayName(fullName?: string | null, date = new Date()): string {
  const name = fullName?.trim() || 'Untitled';
  return `CV _ ${name} _ ${formatCvTitleDate(date)}`;
}

export function defaultCoreClDisplayName(fullName?: string | null, date = new Date()): string {
  const name = fullName?.trim() || 'Untitled';
  return `CL _ ${name} _ ${formatCvTitleDate(date)}`;
}

export function defaultJobCvDisplayName(
  jobTitle?: string | null,
  companyName?: string | null,
  date = new Date()
): string {
  const title = jobTitle?.trim() || 'Role';
  const company = companyName?.trim() || 'Company';
  return `CV _ ${title} _ ${company} _ ${formatCvTitleDate(date)}`;
}

export function defaultJobClDisplayName(
  jobTitle?: string | null,
  companyName?: string | null,
  date = new Date()
): string {
  const title = jobTitle?.trim() || 'Role';
  const company = companyName?.trim() || 'Company';
  return `CL _ ${title} _ ${company} _ ${formatCvTitleDate(date)}`;
}

/** Pick job CL name when both role and company are meaningful; otherwise core CL name. */
export function defaultCoverLetterDisplayName(options: {
  applicantName?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  date?: Date;
}): string {
  const title = options.jobTitle?.trim();
  const company = options.companyName?.trim();
  if (title && company) {
    return defaultJobClDisplayName(title, company, options.date);
  }
  return defaultCoreClDisplayName(options.applicantName, options.date);
}
