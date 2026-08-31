import type { Paragraph, Table } from 'docx';
import type { TemplateConfig } from '@/src/config/templateConfig';
import type { CVData, TemplateId } from '@/src/types/cv.types';

export type DocxBlock = Paragraph | Table;

export type SkillDisplayMode =
  | 'inline'
  | 'bars'
  | 'dots'
  | 'chips'
  | 'sidebar-compact';

export type ExperienceStyle = 'standard' | 'timeline' | 'card';

export interface DocxTheme {
  templateId: TemplateId;
  accent: string;
  headingColor: string;
  bodyColor: string;
  mutedColor: string;
  linkColor: string;
  bodyFont: string;
  headingFont: string;
  sidebarBg: string;
  sidebarText: string;
  layout: TemplateConfig['layout'];
  sidebarSections: string[];
  showPhoto: boolean;
  showSkillBars: boolean;
  skillDisplay: SkillDisplayMode;
  experienceStyle: ExperienceStyle;
  educationDetail: 'basic' | 'academic';
  publicationStyle: 'plain' | 'numbered' | 'apa-ish';
  labelOverrides: Partial<Record<string, string>>;
  /** Strip decorative borders/accents (ats-plain). */
  minimalDecor: boolean;
  /** Executive gold accent on name. */
  nameAccent?: string;
  /** Section title uppercase like base.css. */
  sectionTitleUppercase: boolean;
  sidebarWidthPct: number;
  /** Flatten tables for Google Docs import (default on for all DOCX). */
  googleDocsCompat: boolean;
}

export interface SectionContext {
  cvData: CVData;
  theme: DocxTheme;
  inSidebar?: boolean;
}

export interface LayoutBuildResult {
  blocks: DocxBlock[];
}
