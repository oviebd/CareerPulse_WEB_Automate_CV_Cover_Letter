import {
  Document,
  Footer,
  Packer,
  Paragraph,
  AlignmentType,
} from 'docx';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import { buildGoogleDocsLayout } from './layouts/google-docs-compat';
import { buildEuropassLayout } from './layouts/europass';
import { buildPremiumLayout } from './layouts/premium';
import { buildSingleColumnLayout } from './layouts/single-column';
import { buildTwoColumnStandardLayout } from './layouts/two-column-standard';
import { run } from './primitives';
import { resolveDocxTheme } from './theme';
import type { DocxBlock } from './types';
import { isPremiumTemplate } from './utils';

function watermarkFooter(theme: ReturnType<typeof resolveDocxTheme>): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run(theme, 'Created with CareerPulse', {
            size: 16,
            color: '9CA3AF',
          }),
        ],
      }),
    ],
  });
}

async function buildDocumentBlocks(cvData: CVData): Promise<DocxBlock[]> {
  const tid = normalizeTemplateId(cvData.meta?.templateId);
  const themed: CVData = {
    ...cvData,
    meta: { ...cvData.meta, templateId: tid },
  };
  const theme = resolveDocxTheme(themed);

  if (theme.googleDocsCompat) {
    return buildGoogleDocsLayout(themed, theme);
  }

  if (tid === 'europass') {
    return buildEuropassLayout(themed, theme);
  }
  if (isPremiumTemplate(tid)) {
    return buildPremiumLayout(themed, theme);
  }
  if (theme.layout === 'two-column') {
    return buildTwoColumnStandardLayout(themed, theme);
  }
  return buildSingleColumnLayout(themed, theme);
}

/**
 * Build a themed Word (.docx) CV mirroring PDF template layout families.
 */
export async function generateCVDocx(cvData: CVData): Promise<Buffer> {
  const theme = resolveDocxTheme(cvData);
  const watermark = Boolean(cvData.watermark);
  const children = await buildDocumentBlocks(cvData);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        footers: watermark ? { default: watermarkFooter(theme) } : undefined,
        children: children as never,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
