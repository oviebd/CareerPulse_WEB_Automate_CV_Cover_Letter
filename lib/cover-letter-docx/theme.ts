import type { CoverLetterDocxTheme, CoverLetterDocxVars } from './types';

export function resolveCoverLetterTheme(
  vars: CoverLetterDocxVars
): CoverLetterDocxTheme {
  const accent = (vars.primary_color ?? '#2563EB').replace(/^#/, '').toUpperCase();
  return {
    accent: /^[0-9A-F]{6}$/.test(accent) ? accent : '2563EB',
    bodyFont: 'Calibri',
    headingFont: 'Calibri',
    bodyColor: '0F172A',
    mutedColor: '64748B',
  };
}

export function bodyLines(htmlBody: string): string[] {
  return htmlBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
