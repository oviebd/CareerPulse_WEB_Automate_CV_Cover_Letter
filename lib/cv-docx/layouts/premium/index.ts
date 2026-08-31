import { Paragraph } from 'docx';
import { getVisibleSections } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../../types';
import { twoColumnTable } from '../../primitives';
import { buildInitialAvatar, buildSidebarPhoto } from '../../photo';
import {
  buildEducation,
  buildReferences,
  buildSection,
} from '../../sections/builders';
import {
  buildAmberMainHeader,
  buildMidnightSidebarIdentity,
  buildOceanSidebarIdentity,
  buildSidebarContact,
} from '../../sections/header';
import { run, subline } from '../../primitives';

export async function buildPremiumLayout(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  switch (theme.templateId) {
    case 'amber-strike':
      return buildAmberStrike(cvData, theme);
    case 'midnight-pro':
      return buildMidnightPro(cvData, theme);
    case 'golden-hour':
      return buildGoldenHour(cvData, theme);
    case 'ocean-slate':
      return buildOceanSlate(cvData, theme);
    case 'violet-edge':
      return buildVioletEdge(cvData, theme);
    default:
      return buildAmberStrike(cvData, theme);
  }
}

async function buildAmberStrike(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebar: DocxBlock[] = [];
  if (theme.showPhoto) {
    const photos = await buildSidebarPhoto(cvData, theme);
    sidebar.push(...(photos.length ? photos : [buildInitialAvatar(cvData, theme)]));
  }
  sidebar.push(...buildSidebarContact(cvData, theme));
  if ((cvData.education ?? []).length) {
    sidebar.push(...buildEducation({ cvData, theme, inSidebar: true }));
  }
  if ((cvData.references ?? []).length) {
    sidebar.push(...buildReferences({ cvData, theme, inSidebar: true }));
  }

  const main: DocxBlock[] = buildAmberMainHeader(cvData, theme);
  const skip = new Set(['personal', 'education', 'references']);
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (skip.has(key)) continue;
    main.push(...buildSection(key, { cvData, theme }));
  }
  return [twoColumnTable(theme, sidebar, main)];
}

async function buildMidnightPro(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebar: DocxBlock[] = [];
  if (theme.showPhoto) {
    const photos = await buildSidebarPhoto(cvData, theme);
    sidebar.push(...(photos.length ? photos : [buildInitialAvatar(cvData, theme)]));
  }
  sidebar.push(...buildMidnightSidebarIdentity(cvData, theme));
  sidebar.push(...buildSidebarContact(cvData, theme));
  for (const key of ['skills', 'languages', 'interests'] as const) {
    sidebar.push(...buildSection(key, { cvData, theme, inSidebar: true }));
  }

  const main: DocxBlock[] = [];
  const skip = new Set(['personal', 'skills', 'languages', 'interests']);
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (skip.has(key)) continue;
    main.push(...buildSection(key, { cvData, theme }));
  }
  return [twoColumnTable(theme, sidebar, main)];
}

async function buildGoldenHour(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebar: DocxBlock[] = [];
  if (theme.showPhoto) {
    sidebar.push(...(await buildSidebarPhoto(cvData, theme)));
  }
  sidebar.push(...buildSidebarContact(cvData, theme));
  sidebar.push(...buildSection('skills', { cvData, theme, inSidebar: true }));
  sidebar.push(...buildSection('languages', { cvData, theme, inSidebar: true }));

  const main: DocxBlock[] = [];
  const skip = new Set(['personal', 'skills', 'languages']);
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (skip.has(key)) continue;
    main.push(...buildSection(key, { cvData, theme }));
  }
  return [twoColumnTable(theme, sidebar, main)];
}

async function buildOceanSlate(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebar: DocxBlock[] = [];
  if (theme.showPhoto) {
    const photos = await buildSidebarPhoto(cvData, theme);
    sidebar.push(...(photos.length ? photos : [buildInitialAvatar(cvData, theme)]));
  }
  sidebar.push(...buildOceanSidebarIdentity(cvData, theme));
  sidebar.push(...buildSidebarContact(cvData, theme));

  const main: DocxBlock[] = [];
  const skip = new Set(['personal']);
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (skip.has(key)) continue;
    main.push(...buildSection(key, { cvData, theme }));
  }
  return [twoColumnTable(theme, sidebar, main)];
}

async function buildVioletEdge(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebar: DocxBlock[] = [];
  sidebar.push(...buildSidebarContact(cvData, theme));
  for (const key of ['skills', 'languages', 'interests'] as const) {
    sidebar.push(...buildSection(key, { cvData, theme, inSidebar: true }));
  }

  const main: DocxBlock[] = [];
  if (cvData.personal.fullName) {
    main.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          run(theme, cvData.personal.fullName, {
            bold: true,
            size: 40,
            color: theme.accent,
          }),
        ],
      })
    );
  }
  if (cvData.personal.title) {
    main.push(subline(theme, cvData.personal.title));
  }
  const skip = new Set(['personal', 'skills', 'languages', 'interests']);
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (skip.has(key)) continue;
    main.push(...buildSection(key, { cvData, theme }));
  }
  return [twoColumnTable(theme, main, sidebar, { sidebarFirst: false })];
}
