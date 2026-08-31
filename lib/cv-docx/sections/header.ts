import { AlignmentType, Paragraph } from 'docx';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../types';
import {
  centeredLine,
  run,
  subline,
} from '../primitives';
import { buildPhotoParagraph } from '../photo';
import { contactLine, linksLine } from './builders';
import { splitFullName } from '../utils';

/** Standard centered header for single-column templates. */
export async function buildStandardHeader(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const out: DocxBlock[] = [];
  if (theme.showPhoto && cvData.personal.photo) {
    const photo = await buildPhotoParagraph(cvData, theme);
    if (photo) out.push(photo);
  }
  const fullName = cvData.personal.fullName?.trim();
  if (fullName) {
    out.push(
      centeredLine(theme, fullName, {
        bold: true,
        size: 40,
        color: theme.nameAccent ?? theme.headingColor,
        font: theme.headingFont,
        after: 40,
      })
    );
  }
  const title = cvData.personal.title?.trim();
  if (title) {
    out.push(
      centeredLine(theme, title, {
        size: 24,
        color: theme.mutedColor,
        after: 60,
      })
    );
  }
  const contact = contactLine(cvData);
  if (contact) out.push(centeredLine(theme, contact, { size: 19 }));
  const links = linksLine(cvData);
  if (links) {
    out.push(
      centeredLine(theme, links, {
        size: 19,
        color: theme.linkColor,
        after: 120,
      })
    );
  }
  return out;
}

/** Left-aligned header with optional photo row (modern two-column). */
export async function buildMainColumnHeader(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const out: DocxBlock[] = [];
  const fullName = cvData.personal.fullName?.trim();
  if (fullName) {
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          run(theme, fullName, {
            bold: true,
            size: 36,
            color: theme.accent,
            font: theme.headingFont,
          }),
        ],
      })
    );
  }
  const title = cvData.personal.title?.trim();
  if (title) out.push(subline(theme, title));
  const contact = contactLine(cvData);
  if (contact) out.push(subline(theme, contact));
  const links = linksLine(cvData);
  if (links) out.push(subline(theme, links, theme.linkColor));
  return out;
}

/** Premium amber split name header. */
export function buildAmberMainHeader(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const { first, last } = splitFullName(cvData.personal.fullName ?? '');
  const out: DocxBlock[] = [];
  if (first || last) {
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          run(theme, first, {
            bold: true,
            size: 44,
            color: theme.accent,
          }),
          run(theme, last ? ` ${last}` : '', {
            bold: true,
            size: 44,
            color: theme.bodyColor,
          }),
        ],
      })
    );
  }
  const title = cvData.personal.title?.trim();
  if (title) out.push(subline(theme, title));
  return out;
}

/** Sidebar contact block for premium / two-column sidebars. */
export function buildSidebarContact(
  cvData: CVData,
  theme: DocxTheme,
  label = 'Contact'
): DocxBlock[] {
  const out: DocxBlock[] = [];
  out.push(
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [
        run(theme, label.toUpperCase(), {
          bold: true,
          size: 18,
          color: theme.accent,
        }),
      ],
    })
  );
  const p = cvData.personal;
  if (p.email) {
    out.push(
      new Paragraph({
        children: [run(theme, p.email, { size: 18, color: theme.sidebarText })],
      })
    );
  }
  if (p.phone) {
    out.push(
      new Paragraph({
        children: [run(theme, p.phone, { size: 18, color: theme.sidebarText })],
      })
    );
  }
  if (p.location) {
    out.push(
      new Paragraph({
        children: [
          run(theme, p.location, { size: 18, color: theme.sidebarText }),
        ],
      })
    );
  }
  const l = p.links ?? {};
  for (const url of [
    l.linkedin,
    l.github,
    l.portfolio,
    l.website,
  ].filter(Boolean)) {
    out.push(
      new Paragraph({
        children: [run(theme, url!, { size: 16, color: theme.sidebarText })],
      })
    );
  }
  return out;
}

/** Ocean sidebar: name + title (mirrors ocean-side-name / ocean-side-title). */
export function buildOceanSidebarIdentity(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const out: DocxBlock[] = [];
  const name = cvData.personal.fullName?.trim();
  if (name) {
    out.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          run(theme, name, {
            bold: true,
            size: 40,
            color: 'FFFFFF',
          }),
        ],
      })
    );
  }
  const jobTitle = cvData.personal.title?.trim();
  if (jobTitle) {
    out.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          run(theme, jobTitle, {
            italics: true,
            size: 18,
            color: theme.accent,
          }),
        ],
      })
    );
  }
  return out;
}

/** Midnight sidebar name block (centered). */
export function buildMidnightSidebarIdentity(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const out: DocxBlock[] = [];
  const name = cvData.personal.fullName?.trim();
  if (name) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          run(theme, name, {
            bold: true,
            size: 28,
            color: 'FFFFFF',
          }),
        ],
      })
    );
  }
  const title = cvData.personal.title?.trim();
  if (title) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          run(theme, title, { size: 18, color: theme.sidebarText }),
        ],
      })
    );
  }
  return out;
}
