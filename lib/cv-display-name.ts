const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const;

/** e.g. `12 june 26` */
export function formatCvTitleDate(date = new Date()): string {
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export function defaultCoreCvDisplayName(fullName?: string | null, date = new Date()): string {
  const name = fullName?.trim() || 'Untitled CV';
  return `${name} (${formatCvTitleDate(date)})`;
}

export function defaultJobCvDisplayName(
  jobTitle?: string | null,
  companyName?: string | null,
  date = new Date()
): string {
  const title = jobTitle?.trim() || 'Role';
  const company = companyName?.trim() || 'Company';
  return `${title} _ ${company} (${formatCvTitleDate(date)})`;
}
