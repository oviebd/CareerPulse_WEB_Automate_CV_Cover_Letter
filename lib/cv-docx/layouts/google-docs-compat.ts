import { Paragraph } from 'docx';
import { getVisibleSections } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../types';
import { labeledLine, run, sectionHeading, subline } from '../primitives';
import { buildSection, contactLine, linksLine } from '../sections/builders';
import {
  buildAmberMainHeader,
  buildMainColumnHeader,
  buildStandardHeader,
} from '../sections/header';
import { buildPhotoParagraph } from '../photo';
import { isPremiumTemplate } from '../utils';

/**
 * Single-column DOCX layout optimized for Google Docs import.
 * Avoids two-column tables, dark sidebar cells, and nested skill-bar tables.
 */
export async function buildGoogleDocsLayout(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = [];

  if (theme.templateId === 'europass') {
    blocks.push(...buildEuropassGoogleDocsHeader(cvData, theme));
  } else {
    blocks.push(...(await buildGoogleDocsHeader(cvData, theme)));
  }

  const ctx = { cvData, theme };
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (key === 'personal') continue;
    blocks.push(...buildSection(key, ctx));
  }

  return blocks;
}

async function buildGoogleDocsHeader(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  if (theme.templateId === 'amber-strike') {
    const out = buildAmberMainHeader(cvData, theme);
    const contact = contactLine(cvData);
    if (contact) out.push(subline(theme, contact));
    const links = linksLine(cvData);
    if (links) out.push(subline(theme, links, theme.linkColor));
    return out;
  }

  if (isPremiumTemplate(theme.templateId) || theme.layout === 'two-column') {
    const out: DocxBlock[] = [];
    if (theme.showPhoto && cvData.personal.photo) {
      const photo = await buildPhotoParagraph(cvData, theme);
      if (photo) out.push(photo);
    }
    out.push(...(await buildMainColumnHeader(cvData, theme)));
    return out;
  }

  return buildStandardHeader(cvData, theme);
}

function buildEuropassGoogleDocsHeader(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const out: DocxBlock[] = [];
  const name = cvData.personal.fullName?.trim() ?? 'CV';
  out.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [
        run(theme, name, { bold: true, size: 36, color: '003399' }),
      ],
    })
  );

  out.push(sectionHeading(theme, 'Personal information'));
  const p = cvData.personal;
  if (p.email) out.push(labeledLine(theme, 'Email', p.email));
  if (p.phone) out.push(labeledLine(theme, 'Phone', p.phone));
  if (p.location) out.push(labeledLine(theme, 'Location', p.location));
  if (cvData.postalAddress) {
    out.push(labeledLine(theme, 'Address', cvData.postalAddress));
  }
  if (p.dateOfBirth) out.push(labeledLine(theme, 'Date of birth', p.dateOfBirth));
  if (p.nationality) out.push(labeledLine(theme, 'Nationality', p.nationality));

  const links = linksLine(cvData);
  if (links) out.push(subline(theme, links));
  return out;
}
