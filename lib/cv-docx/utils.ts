import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { TemplateId } from '@/src/types/cv.types';

/** Strip # from hex for docx TextRun color fields. */
export function hexColor(raw: string | undefined, fallback: string): string {
  const v = (raw ?? fallback).replace(/^#/, '').trim();
  return /^[0-9A-Fa-f]{6}$/.test(v) ? v.toUpperCase() : fallback.replace(/^#/, '');
}

/** Same "Jan 2024" formatting as formatYm() in sections.js. */
export function formatYm(ym: string | undefined): string {
  if (!ym || typeof ym !== 'string') return '';
  const m = ym.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!m) return ym;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mi = Math.min(12, Math.max(1, parseInt(m[2], 10))) - 1;
  return `${months[mi]} ${m[1]}`;
}

export function dateRange(
  start?: string,
  end?: string,
  current?: boolean
): string {
  const a = formatYm(start);
  const b = current ? 'Present' : formatYm(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
}

export function splitFullName(full: string): { first: string; last: string } {
  const parts = (full ?? '').trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function nameInitial(full: string): string {
  const t = (full ?? '').trim();
  return t ? t.charAt(0).toUpperCase() : '?';
}

const PREMIUM_IDS = new Set([
  'amber-strike',
  'midnight-pro',
  'golden-hour',
  'ocean-slate',
  'violet-edge',
]);

export function isPremiumTemplate(id: TemplateId): boolean {
  return PREMIUM_IDS.has(id);
}

export function sectionTitleFor(key: string, templateId: TemplateId): string {
  const cfg = TEMPLATE_CONFIGS[templateId];
  const overrides = cfg?.labelOverrides ?? {};
  const defaults: Record<string, string> = {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    publications: 'Publications',
    research: 'Research',
    certifications: 'Certifications',
    awards: 'Awards',
    volunteer: 'Volunteer',
    languages: 'Languages',
    interests: 'Interests',
    references: 'References',
  };
  return overrides[key] ?? defaults[key] ?? key;
}
