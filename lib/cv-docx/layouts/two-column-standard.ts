import { getVisibleSections } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../types';
import { twoColumnTable } from '../primitives';
import { buildSection } from '../sections/builders';
import { buildMainColumnHeader } from '../sections/header';

export async function buildTwoColumnStandardLayout(
  cvData: CVData,
  theme: DocxTheme
): Promise<DocxBlock[]> {
  const sidebarKeys = new Set(theme.sidebarSections);
  const order = getVisibleSections(theme.templateId, cvData);
  const sidebarBlocks: DocxBlock[] = [];
  const mainBlocks: DocxBlock[] = [];

  mainBlocks.push(...(await buildMainColumnHeader(cvData, theme)));

  for (const key of order) {
    if (key === 'personal') continue;
    if (sidebarKeys.has(key)) {
      sidebarBlocks.push(
        ...buildSection(key, { cvData, theme, inSidebar: true })
      );
    } else if (key === 'interests' && theme.templateId === 'technical') {
      continue;
    } else {
      mainBlocks.push(...buildSection(key, { cvData, theme }));
    }
  }

  if (theme.templateId === 'creative') {
    const tools = (cvData.skills ?? []).filter((g) =>
      (g.category ?? '').toLowerCase().includes('tool')
    );
    if (tools.length) {
      sidebarBlocks.push(
        ...buildSection('skills', {
          cvData: { ...cvData, skills: tools },
          theme,
          inSidebar: true,
        })
      );
    }
  }

  return [twoColumnTable(theme, sidebarBlocks, mainBlocks)];
}
