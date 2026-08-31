import { getVisibleSections } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../types';
import { buildSection } from '../sections/builders';
import { buildStandardHeader } from '../sections/header';

export async function buildSingleColumnLayout(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const blocks: DocxBlock[] = [];
  blocks.push(...(await buildStandardHeader(cvData, theme)));
  const ctx = { cvData, theme };
  for (const key of getVisibleSections(theme.templateId, cvData)) {
    if (key === 'personal') continue;
    blocks.push(...buildSection(key, ctx));
  }
  return blocks;
}
