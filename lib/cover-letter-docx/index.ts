import { Document, Packer, Paragraph, Table } from 'docx';
import type { ClTemplateId } from '@/src/config/templateConfig';
import { buildClClassic } from './templates/cl-classic';
import { buildClCreative } from './templates/cl-creative';
import { buildClFormal } from './templates/cl-formal';
import { buildClMinimal } from './templates/cl-minimal';
import { buildClModern } from './templates/cl-modern';
import type { CoverLetterDocxVars } from './types';
import { resolveCoverLetterTheme } from './theme';

export async function generateCoverLetterDocx(
  templateId: string,
  vars: CoverLetterDocxVars
): Promise<Buffer> {
  const theme = resolveCoverLetterTheme(vars);
  const tid = templateId as ClTemplateId;
  let blocks: (Paragraph | Table)[];

  switch (tid) {
    case 'cl-modern':
      blocks = buildClModern(vars, theme);
      break;
    case 'cl-minimal':
      blocks = buildClMinimal(vars, theme);
      break;
    case 'cl-formal':
      blocks = buildClFormal(vars, theme);
      break;
    case 'cl-creative':
      blocks = buildClCreative(vars, theme);
      break;
    case 'cl-classic':
    default:
      blocks = buildClClassic(vars, theme);
      break;
  }

  const doc = new Document({
    sections: [{ children: blocks }],
  });
  return Packer.toBuffer(doc);
}
