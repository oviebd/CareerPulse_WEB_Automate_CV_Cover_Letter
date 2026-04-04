import { existsSync, readFileSync } from 'fs';
import path from 'path';
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { createAdminClient } from '@/lib/supabase/server';
import { applyCvSectionVisibility } from '@/lib/cv-section-visibility';
import type { CVData, CVProfile, EntryLink, ProfileLink, ReferralEntry, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

let browser: Browser | null = null;

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=none',
] as const;

/** Prefer bundled Chrome; if not installed, use system Chrome (no `npx puppeteer browsers install` required). */
function getPuppeteerLaunchOptions(): LaunchOptions {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    return {
      headless: true,
      executablePath: envPath,
      args: [...PUPPETEER_ARGS],
    };
  }
  const bundled = puppeteer.executablePath();
  if (existsSync(bundled)) {
    return {
      headless: true,
      args: [...PUPPETEER_ARGS],
    };
  }
  return {
    headless: true,
    channel: 'chrome',
    args: [...PUPPETEER_ARGS],
  };
}

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());
  }
  return browser;
}

export async function closePdfBrowser(): Promise<void> {
  if (browser && browser.isConnected()) {
    await browser.close();
    browser = null;
  }
}

export async function generatePDF(html: string): Promise<Buffer> {
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    // Respect template-defined @page margins on every printed page.
    preferCSSPageSize: true,
  });
  await page.close();
  return Buffer.from(pdf);
}

export function injectTemplateData(
  templateHtml: string,
  data: Record<string, string>
): string {
  let result = templateHtml;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  // Many of our stored URLs are domain-like (e.g. "linkedin.com/in/...").
  return `https://${s.replace(/^\/+/, '')}`;
}

function urlToLabel(url: string | null | undefined): string {
  const normalized = normalizeUrl(url);
  if (!normalized) return 'Link';
  try {
    const u = new URL(normalized);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('coursera.org')) return 'Coursera';
    if (host.includes('udemy.com')) return 'Udemy';
    return host;
  } catch {
    return 'Link';
  }
}

function monthYearToValue(ym: string | null | undefined): number {
  if (!ym) return Number.NEGATIVE_INFINITY;
  const s = String(ym).trim();
  if (!s) return Number.NEGATIVE_INFINITY;
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return Number.NEGATIVE_INFINITY;
  }
  const clampedMonth = Math.min(12, Math.max(1, month));
  return year * 12 + clampedMonth;
}

function projectSortValue(p: { start_date: string | null; end_date: string | null }): number {
  return monthYearToValue(p.start_date ?? p.end_date);
}

export function formatMonthYear(ym: string | null | undefined): string {
  if (ym == null || typeof ym !== 'string' || ym.trim() === '') return '';
  const m = ym.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!m) return '';
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const mi = Math.min(12, Math.max(1, parseInt(m[2], 10))) - 1;
  return `${months[mi]} ${m[1]}`;
}

function getFromStack(
  stack: Record<string, unknown>[],
  path: string
): unknown {
  const parts = path.split('.');
  for (let i = stack.length - 1; i >= 0; i--) {
    let cur: unknown = stack[i];
    let ok = true;
    for (const p of parts) {
      if (cur == null || typeof cur !== 'object') {
        ok = false;
        break;
      }
      const o = cur as Record<string, unknown>;
      if (!(p in o)) {
        ok = false;
        break;
      }
      cur = o[p];
    }
    if (ok) return cur;
  }
  return undefined;
}

function isTruthy(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function findMatchingClose(
  html: string,
  start: number,
  openToken: string,
  closeToken: string
): number {
  let depth = 1;
  let pos = start;
  while (depth > 0 && pos < html.length) {
    const nextOpen = html.indexOf(openToken, pos);
    const nextClose = html.indexOf(closeToken, pos);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + openToken.length;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      pos = nextClose + closeToken.length;
    }
  }
  return -1;
}

function splitIfElseAtDepth0(inner: string): { t: string; f: string } {
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    const slice = inner.slice(i);
    if (slice.startsWith('{{#if ')) {
      depth++;
      i += '{{#if '.length;
      continue;
    }
    if (slice.startsWith('{{#each ')) {
      depth++;
      i += '{{#each '.length;
      continue;
    }
    if (slice.startsWith('{{#ifCurrent ')) {
      depth++;
      i += '{{#ifCurrent '.length;
      continue;
    }
    if (slice.startsWith('{{/if}}')) {
      depth--;
      i += '{{/if}}'.length;
      continue;
    }
    if (slice.startsWith('{{/each}}')) {
      depth--;
      i += '{{/each}}'.length;
      continue;
    }
    if (slice.startsWith('{{/ifCurrent}}')) {
      depth--;
      i += '{{/ifCurrent}}'.length;
      continue;
    }
    if (slice.startsWith('{{else}}') && depth === 0) {
      return { t: inner.slice(0, i), f: inner.slice(i + 8) };
    }
    i++;
  }
  return { t: inner, f: '' };
}

function substitutePlain(html: string, stack: Record<string, unknown>[]): string {
  return html.replace(/\{\{([\s\S]*?)\}\}/g, (full, inner: string) => {
    const trimmed = inner.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('/')) return full;

    const fmt = trimmed.match(/^formatDate\s+(.+)$/);
    if (fmt) {
      let arg = fmt[1].trim();
      if (
        (arg.startsWith('"') && arg.endsWith('"')) ||
        (arg.startsWith("'") && arg.endsWith("'"))
      ) {
        arg = arg.slice(1, -1);
        return escapeHtml(formatMonthYear(arg));
      }
      const v = getFromStack(stack, arg) as string | null | undefined;
      return escapeHtml(formatMonthYear(v ?? undefined));
    }

    const joinM = trimmed.match(/^join\s+([\w.]+)\s*$/);
    if (joinM) {
      const arr = getFromStack(stack, joinM[1]);
      if (Array.isArray(arr)) {
        return escapeHtml(
          arr.map((x) => String(x)).filter(Boolean).join(', ')
        );
      }
      return '';
    }

    const raw = trimmed.endsWith('|raw');
    const path = raw ? trimmed.slice(0, -4).trim() : trimmed;
    const v = getFromStack(stack, path);
    if (v === undefined || v === null) return '';
    const str = typeof v === 'object' ? String(v) : String(v);
    return raw ? str : escapeHtml(str);
  });
}

function renderRecursive(html: string, stack: Record<string, unknown>[]): string {
  const idxIfCurrent = html.indexOf('{{#ifCurrent ');
  const idxEach = html.indexOf('{{#each ');
  const idxIf = html.indexOf('{{#if ');

  const candidates: { pos: number; kind: 'ifCurrent' | 'each' | 'if' }[] = [];
  if (idxIfCurrent !== -1) candidates.push({ pos: idxIfCurrent, kind: 'ifCurrent' });
  if (idxEach !== -1) candidates.push({ pos: idxEach, kind: 'each' });
  if (idxIf !== -1) {
    if (idxIf !== idxIfCurrent) candidates.push({ pos: idxIf, kind: 'if' });
  }
  if (candidates.length === 0) return substitutePlain(html, stack);

  candidates.sort((a, b) => a.pos - b.pos);
  const first = candidates[0];
  const start = first.pos;

  if (first.kind === 'ifCurrent') {
    const openEnd = html.indexOf('}}', start);
    if (openEnd === -1) return substitutePlain(html, stack);
    const header = html.slice(start + '{{#ifCurrent '.length, openEnd).trim();
    const parts = header.split(/\s+/);
    const isKey = parts[0] ?? 'is_current';
    const endKey = parts[1] ?? 'end_date';
    const closeStart = findMatchingClose(
      html,
      openEnd + 2,
      '{{#ifCurrent ',
      '{{/ifCurrent}}'
    );
    if (closeStart === -1) return substitutePlain(html, stack);
    const inner = html.slice(openEnd + 2, closeStart);
    const after = html.slice(closeStart + 15);
    const before = html.slice(0, start);
    const isCur = Boolean(getFromStack(stack, isKey));
    const endDate = getFromStack(stack, endKey) as string | null | undefined;
    const { t, f } = splitIfElseAtDepth0(inner);
    const out = isCur
      ? renderRecursive(t, stack)
      : renderRecursive(f, stack);
    return renderRecursive(before, stack) + out + renderRecursive(after, stack);
  }

  if (first.kind === 'each') {
    const openEnd = html.indexOf('}}', start);
    if (openEnd === -1) return substitutePlain(html, stack);
    const arrPath = html.slice(start + 8, openEnd).trim();
    const closeIdx = findMatchingClose(
      html,
      openEnd + 2,
      '{{#each ',
      '{{/each}}'
    );
    if (closeIdx === -1) return substitutePlain(html, stack);
    const inner = html.slice(openEnd + 2, closeIdx);
    const after = html.slice(closeIdx + 9);
    const before = html.slice(0, start);
    const rawArr = getFromStack(stack, arrPath);
    const arr = Array.isArray(rawArr) ? rawArr : [];
    let middle = '';
    for (const el of arr) {
      const nextStack =
        typeof el === 'string' || typeof el === 'number'
          ? [...stack, { this: String(el) }]
          : [...stack, el as Record<string, unknown>];
      middle += renderRecursive(inner, nextStack);
    }
    return renderRecursive(before, stack) + middle + renderRecursive(after, stack);
  }

  const openEnd = html.indexOf('}}', start);
  if (openEnd === -1) return substitutePlain(html, stack);
  const condPath = html.slice(start + 6, openEnd).trim();
  const closeIdx = findMatchingClose(html, openEnd + 2, '{{#if ', '{{/if}}');
  if (closeIdx === -1) return substitutePlain(html, stack);
  const inner = html.slice(openEnd + 2, closeIdx);
  const after = html.slice(closeIdx + 7);
  const before = html.slice(0, start);
  const cond = isTruthy(getFromStack(stack, condPath));
  const { t, f } = splitIfElseAtDepth0(inner);
  const out = cond ? renderRecursive(t, stack) : renderRecursive(f, stack);
  return renderRecursive(before, stack) + out + renderRecursive(after, stack);
}

function initialsFromName(name: string | null | undefined): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function nameTwoLines(name: string | null | undefined): {
  name_line1: string;
  name_line2: string;
} {
  if (!name?.trim()) return { name_line1: '', name_line2: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { name_line1: parts[0], name_line2: '' };
  const last = parts.pop()!;
  return { name_line1: parts.join(' '), name_line2: last };
}

function flattenSkillItems(
  skills: CVData['skills'] | undefined,
  max: number
): string[] {
  const out: string[] = [];
  for (const s of skills ?? []) {
    for (const item of s.items ?? []) {
      if (out.length >= max) return out;
      out.push(item);
    }
  }
  return out;
}

function skillItemsByCategory(
  skills: CVData['skills'] | undefined,
  cat: 'technical' | 'soft' | 'tools' | 'languages'
): string[] {
  return skills?.find((x) => x.category === cat)?.items ?? [];
}

/** Migrate old single `url` string to an EntryLink array (backward-compat). */
function migrateEntryLinks(
  links: unknown,
  legacyUrl: string | null | undefined
): { label: string; url: string }[] {
  if (Array.isArray(links) && links.length > 0) return links as { label: string; url: string }[];
  if (legacyUrl?.trim()) return [{ label: urlToLabel(legacyUrl), url: legacyUrl }];
  return [];
}

/** Migrate old portfolio_url / website_url to a ProfileLink array (backward-compat). */
function migrateProfileLinks(
  links: unknown,
  portfolioUrl: string | null | undefined,
  websiteUrl: string | null | undefined
): ProfileLink[] {
  if (Array.isArray(links) && links.length > 0) return links as ProfileLink[];
  const out: ProfileLink[] = [];
  if (portfolioUrl?.trim()) out.push({ id: 'legacy-portfolio', label: 'Portfolio', url: portfolioUrl.trim() });
  if (websiteUrl?.trim()) out.push({ id: 'legacy-website', label: 'Website', url: websiteUrl.trim() });
  return out;
}

export function renderTemplate(templateId: string, cvData: CVData): string {
  const filePath = path.join(
    process.cwd(),
    'templates',
    'cv',
    `${templateId}.html`
  );
  let html = readFileSync(filePath, 'utf-8');
  const accent = cvData.accent_color ?? '#6C63FF';

  const normalizedLinkedin = normalizeUrl(cvData.linkedin_url);
  const normalizedGithub = normalizeUrl(cvData.github_url);

  // Normalize extra profile links; backward-compat: merge old portfolio/website if not already in links.
  const seenLinkUrls = new Set<string>();
  const normalizedLinks: (ProfileLink & { url: string })[] = [];
  for (const l of cvData.links ?? []) {
    const u = normalizeUrl(l.url);
    if (u && !seenLinkUrls.has(u)) {
      seenLinkUrls.add(u);
      normalizedLinks.push({ ...l, url: u });
    }
  }
  // Backward-compat: include old portfolio_url / website_url if not already in links
  const legacyPortfolio = normalizeUrl(cvData.portfolio_url);
  const legacyWebsite = normalizeUrl(cvData.website_url);
  if (legacyPortfolio && !seenLinkUrls.has(legacyPortfolio)) {
    normalizedLinks.push({ id: 'legacy-portfolio', label: 'Portfolio', url: legacyPortfolio });
    seenLinkUrls.add(legacyPortfolio);
  }
  if (legacyWebsite && !seenLinkUrls.has(legacyWebsite)) {
    normalizedLinks.push({ id: 'legacy-website', label: 'Website', url: legacyWebsite });
    seenLinkUrls.add(legacyWebsite);
  }

  const contactParts: string[] = [];
  if (cvData.email) contactParts.push(escapeHtml(cvData.email));
  if (cvData.phone) contactParts.push(escapeHtml(cvData.phone));
  if (cvData.location) contactParts.push(escapeHtml(cvData.location));
  if (normalizedLinkedin) {
    contactParts.push(
      `<a href="${escapeHtml(normalizedLinkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn</a>`
    );
  }
  if (normalizedGithub) {
    contactParts.push(
      `<a href="${escapeHtml(normalizedGithub)}" target="_blank" rel="noopener noreferrer">GitHub</a>`
    );
  }
  for (const l of normalizedLinks) {
    contactParts.push(
      `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
    );
  }

  const sortedExperience = [...(cvData.experience ?? [])].sort(
    (a, b) =>
      monthYearToValue(b.start_date) - monthYearToValue(a.start_date)
  );
  const sortedProjects = [...(cvData.projects ?? [])].sort(
    (a, b) => projectSortValue(b) - projectSortValue(a)
  );
  const sortedCertifications = [...(cvData.certifications ?? [])].sort(
    (a, b) => monthYearToValue(b.issue_date) - monthYearToValue(a.issue_date)
  );

  const normalizedProjects = sortedProjects.map((p) => {
    // Normalize the links array; backward-compat: build from legacy url if links is empty.
    const rawLinks: EntryLink[] = Array.isArray(p.links) && p.links.length > 0
      ? p.links
      : (p.url ? [{ label: urlToLabel(p.url), url: p.url }] : []);
    const links = rawLinks.map((l) => ({ label: l.label, url: normalizeUrl(l.url) ?? l.url })).filter((l) => l.url);
    return { ...p, links, url: links[0]?.url ?? null, url_label: links[0]?.label ?? '' };
  });

  const normalizedCertifications = sortedCertifications.map((c) => {
    const rawLinks: EntryLink[] = Array.isArray(c.links) && c.links.length > 0
      ? c.links
      : (c.url ? [{ label: urlToLabel(c.url), url: c.url }] : []);
    const links = rawLinks.map((l) => ({ label: l.label, url: normalizeUrl(l.url) ?? l.url })).filter((l) => l.url);
    return { ...c, links, url: links[0]?.url ?? null, url_label: links[0]?.label ?? '' };
  });

  const twoLineName = nameTwoLines(cvData.full_name);
  const coreSkillItems = [
    ...skillItemsByCategory(cvData.skills, 'technical'),
    ...skillItemsByCategory(cvData.skills, 'soft'),
    ...skillItemsByCategory(cvData.skills, 'languages'),
  ].slice(0, 14);

  const root: Record<string, unknown> = {
    ...cvData,
    ...twoLineName,
    initials: initialsFromName(cvData.full_name),
    skill_tags: flattenSkillItems(cvData.skills, 8),
    skills_core_items: coreSkillItems,
    skills_tools_items: skillItemsByCategory(cvData.skills, 'tools'),
    accent_color: accent,
    contact_line: contactParts.join(' | '),
    linkedin_url: normalizedLinkedin,
    github_url: normalizedGithub,
    links: normalizedLinks,
    experience: sortedExperience,
    education: cvData.education ?? [],
    skills: cvData.skills ?? [],
    projects: normalizedProjects,
    certifications: normalizedCertifications,
    languages: cvData.languages ?? [],
    awards: cvData.awards ?? [],
    font_family_url: (cvData.font_family ?? 'Inter').replace(/\s+/g, '+'),
  };
  return renderRecursive(html, [root]);
}

export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'cv';
}

/** Merge a partial profile (e.g. editor draft) into CVData for HTML/PDF rendering. */
export function looseProfileToCVData(
  row: Partial<CVProfile> & Record<string, unknown>,
  options: { accent_color?: string; watermark?: boolean }
): CVData {
  const merged = {
    full_name: row.full_name ?? null,
    professional_title: row.professional_title ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    location: row.location ?? null,
    linkedin_url: row.linkedin_url ?? null,
    github_url: row.github_url ?? null,
    links: migrateProfileLinks(row.links, row.portfolio_url, row.website_url),
    address: row.address ?? null,
    photo_url: row.photo_url ?? null,
    summary: row.summary ?? null,
    experience: Array.isArray(row.experience) ? row.experience : [],
    education: Array.isArray(row.education) ? row.education : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    projects: Array.isArray(row.projects) ? row.projects : [],
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    languages: Array.isArray(row.languages) ? row.languages : [],
    awards: Array.isArray(row.awards) ? row.awards : [],
    referrals: Array.isArray(row.referrals) ? row.referrals : [],
    section_visibility:
      row.section_visibility && typeof row.section_visibility === 'object'
        ? row.section_visibility
        : {},
  } as CVProfile;
  return cvProfileToCVData(merged, options);
}

export function cvProfileToCVData(
  row: CVProfile,
  options: { accent_color?: string; watermark?: boolean }
): CVData {
  const rawExp = row.experience ?? [];
  const exp = rawExp.map((e) => ({
    ...e,
    location: e.location ?? null,
    start_date: e.start_date ?? null,
    end_date: e.end_date ?? null,
    description: e.description ?? null,
    bullets: Array.isArray(e.bullets) ? e.bullets : [],
  })) as CVData['experience'];
  const edu = (row.education ?? []) as CVData['education'];
  const skills = (row.skills ?? []) as CVData['skills'];
  const projects = (row.projects ?? []).map((p) => ({
    ...p,
    description: p.description ?? null,
    links: migrateEntryLinks(p.links, p.url),
  })) as CVData['projects'];
  const certs = (row.certifications ?? []).map((c) => ({
    ...c,
    issuer: c.issuer ?? null,
    issue_date: c.issue_date ?? null,
    expiry_date: c.expiry_date ?? null,
    links: migrateEntryLinks(c.links, c.url),
  })) as CVData['certifications'];
  const langs = (row.languages ?? []) as CVData['languages'];
  const awards = (row.awards ?? []).map((a) => ({
    ...a,
    issuer: a.issuer ?? null,
    date: a.date ?? null,
    description: a.description ?? null,
  })) as CVData['awards'];

  const rawRefs = Array.isArray(row.referrals) ? row.referrals : [];
  const referrals = rawRefs.slice(0, 2).map((r) => {
    const x = r as ReferralEntry;
    return {
      id: String(x.id ?? ''),
      name: String(x.name ?? ''),
      title: x.title ?? null,
      company: x.company ?? null,
      email: x.email ?? null,
      phone: x.phone ?? null,
      relationship: x.relationship ?? null,
    };
  }) as ReferralEntry[];

  const base: CVData = {
    full_name: row.full_name,
    professional_title: row.professional_title,
    email: row.email,
    phone: row.phone,
    location: row.location,
    linkedin_url: row.linkedin_url,
    github_url: row.github_url,
    links: migrateProfileLinks(row.links, row.portfolio_url, row.website_url),
    address: row.address ?? null,
    photo_url: row.photo_url ?? null,
    summary: row.summary,
    experience: exp,
    education: edu,
    skills: skills,
    projects: projects,
    certifications: certs,
    languages: langs,
    awards,
    referrals,
    accent_color: options.accent_color ?? '#6C63FF',
    font_family: row.font_family ?? 'Inter',
    watermark: options.watermark ?? false,
  };
  return applyCvSectionVisibility(base, row.section_visibility);
}

export async function exportCV(
  userId: string,
  templateId: string,
  accentColor?: string,
  snapshot?: Partial<CVProfile> | null,
  coreCvId?: string | null,
  fontFamily?: string
): Promise<{ pdf: Buffer; filename: string }> {
  const supabase = createAdminClient();
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  if (pErr || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }
  const tier = resolveEffectiveTier(profile.subscription_tier);

  const { data: tmpl, error: tErr } = await supabase
    .from('cv_templates')
    .select('id, type, available_tiers')
    .eq('id', templateId)
    .eq('type', 'cv')
    .maybeSingle();
  if (tErr || !tmpl) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }
  const tiers = tmpl.available_tiers as SubscriptionTier[];
  if (!canUseTemplate(tiers, tier)) {
    throw new Error('TEMPLATE_FORBIDDEN');
  }

  // Base CV to merge over. When exporting a draft/template snapshot, we can
  // skip requiring a saved core CV row.
  let cvRow: CVProfile | null = null;
  if (coreCvId) {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', coreCvId)
      .maybeSingle();
    if (!error && data) cvRow = data as CVProfile;
  } else {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) cvRow = data as CVProfile;
  }

  // If no base row exists but a snapshot is provided, export using the snapshot.
  // Otherwise we need a saved CV row.
  if (!cvRow && !(snapshot && typeof snapshot === 'object')) {
    throw new Error('CV_NOT_FOUND');
  }

  let cv = (cvRow ?? {}) as CVProfile;
  if (snapshot && typeof snapshot === 'object') {
    const { id: _i, user_id: _u, ...rest } = snapshot;
    cv = { ...cv, ...rest } as CVProfile;
  }
  // We'll allow a basic render even if incomplete so the preview works
  // as soon as the user starts typing their name.
  if (!cv.full_name?.trim()) {
    // If name is missing, we still render but with a placeholder (or empty)
    // instead of throwing CV_INCOMPLETE to avoid breaking the preview.
  }

  const watermark = tier === 'free';
  const cvData = cvProfileToCVData(cv, {
    accent_color: accentColor ?? '#6C63FF',
    watermark,
  });
  if (fontFamily) cvData.font_family = fontFamily;
  const html = renderTemplate(templateId, cvData);
  const pdf = await generatePDF(html);
  const nameSlug = slugifyName(cv.full_name ?? 'untitled');
  const filename = `cv-${nameSlug}-${templateId}.pdf`;
  return { pdf, filename };
}
