import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { CVData, TemplateId } from '@/src/types/cv.types';
import type { DocxTheme, ExperienceStyle, SkillDisplayMode } from './types';
import { hexColor, isPremiumTemplate } from './utils';

const FONT_MAP: Record<string, string> = {
  Inter: 'Calibri',
  'DM Sans': 'Calibri',
  'Source Serif 4': 'Georgia',
  Georgia: 'Georgia',
  Roboto: 'Calibri',
  'Roboto Condensed': 'Calibri',
  Lato: 'Calibri',
  Poppins: 'Calibri',
  'Nunito Sans': 'Calibri',
  'Space Grotesk': 'Calibri',
  'ui-monospace': 'Courier New',
  monospace: 'Courier New',
};

const PREMIUM_SIDEBAR: Partial<
  Record<TemplateId, { bg: string; text: string; accent: string }>
> = {
  'amber-strike': { bg: '2C2C2C', text: 'CCCCCC', accent: 'F5C518' },
  'midnight-pro': { bg: '1B2137', text: 'A8B4CF', accent: '4F8EF7' },
  'golden-hour': { bg: '2C2416', text: 'D4C4A8', accent: 'F0B429' },
  'ocean-slate': { bg: '0D3349', text: 'B0C8D8', accent: '00C9A7' },
  'violet-edge': { bg: 'F3F0FF', text: '4C1D95', accent: 'A78BFA' },
};

function mapFont(name: string | undefined): string {
  const raw = (name ?? 'Inter').trim() || 'Inter';
  return FONT_MAP[raw] ?? 'Calibri';
}

function skillDisplayFor(
  id: TemplateId,
  cfg: (typeof TEMPLATE_CONFIGS)[TemplateId],
  showSkillProficiency: boolean
): SkillDisplayMode {
  if (!showSkillProficiency) {
    if (id === 'technical') return 'chips';
    return cfg.layout === 'two-column' ? 'sidebar-compact' : 'inline';
  }
  if (id === 'technical') return 'chips';
  if (id === 'violet-edge') return 'dots';
  if (id === 'ocean-slate') return 'bars';
  if (cfg.showSkillBars) return 'bars';
  if (
    ['classic', 'academic', 'minimal', 'healthcare', 'entry-level'].includes(id)
  ) {
    return 'inline';
  }
  return cfg.layout === 'two-column' ? 'sidebar-compact' : 'inline';
}

function experienceStyleFor(id: TemplateId): ExperienceStyle {
  if (id === 'golden-hour' || id === 'violet-edge') return 'timeline';
  if (id === 'amber-strike') return 'card';
  return 'standard';
}

/** Resolve DOCX styling tokens from CVData + template config (mirrors sections.js accent rules). */
export function resolveDocxTheme(cvData: CVData): DocxTheme {
  const templateId = (cvData.meta?.templateId ?? 'classic') as TemplateId;
  const cfg = TEMPLATE_CONFIGS[templateId];
  const premium = isPremiumTemplate(templateId);
  const premiumPalette = PREMIUM_SIDEBAR[templateId];

  let accent: string;
  if (templateId === 'europass') {
    accent = '003399';
  } else if (templateId === 'executive') {
    accent = hexColor('#c9a84c', 'C9A84C');
  } else if (templateId === 'ats-plain') {
    accent = '000000';
  } else if (premium && premiumPalette) {
    accent = premiumPalette.accent;
  } else {
    accent = hexColor(cvData.meta?.colorScheme, '6C63FF');
  }

  const headingColor =
    templateId === 'executive'
      ? '1E2D4A'
      : templateId === 'ats-plain'
        ? '000000'
        : '1A1A2E';

  const bodyFont = mapFont(cvData.meta?.fontFamily);
  const headingFont = templateId === 'executive' ? 'Georgia' : bodyFont;

  const sidebarBg =
    premium && premiumPalette
      ? premiumPalette.bg
      : templateId === 'violet-edge'
        ? 'F3F0FF'
        : 'F8FAFC';

  const sidebarText =
    premium && premiumPalette ? premiumPalette.text : '475569';

  const photoAllowed =
    !cvData.sectionVisibility || cvData.sectionVisibility.photo !== false;

  const showRatings =
    Boolean(cvData.showSkillProficiency) &&
    (cfg.showSkillBars || cfg.showsSkillRatingInCv);

  return {
    templateId,
    accent,
    headingColor: hexColor(headingColor, '1A1A2E'),
    bodyColor: '1A1A2E',
    mutedColor: '64748B',
    linkColor: accent,
    bodyFont,
    headingFont,
    sidebarBg,
    sidebarText,
    layout: cfg.layout,
    sidebarSections: cfg.sidebarSections ?? [],
    showPhoto: Boolean(cfg.showPhoto && cvData.meta?.showPhoto && photoAllowed),
    showSkillBars: showRatings,
    skillDisplay: skillDisplayFor(templateId, cfg, Boolean(cvData.showSkillProficiency)),
    experienceStyle: experienceStyleFor(templateId),
    educationDetail: cfg.educationDetail ?? 'basic',
    publicationStyle: cfg.publicationStyle ?? 'plain',
    labelOverrides: cfg.labelOverrides ?? {},
    minimalDecor: templateId === 'ats-plain' || templateId === 'minimal',
    nameAccent: templateId === 'executive' ? 'C9A84C' : undefined,
    sectionTitleUppercase: !premium && templateId !== 'europass',
    sidebarWidthPct: templateId === 'violet-edge' ? 34 : 32,
    googleDocsCompat: true,
  };
}
