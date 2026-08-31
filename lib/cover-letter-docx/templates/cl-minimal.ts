import { Paragraph, type Table } from 'docx';
import { bodyParagraphs, para } from '../helpers';
import type { CoverLetterDocxTheme, CoverLetterDocxVars } from '../types';
import { bodyLines } from '../theme';

export function buildClMinimal(
  vars: CoverLetterDocxVars,
  theme: CoverLetterDocxTheme
): (Paragraph | Table)[] {
  const lines = bodyLines(vars.cover_letter_body);
  const out: Paragraph[] = [];
  if (vars.applicant_name) {
    out.push(para(theme, vars.applicant_name, { bold: true, size: 32, spacingAfter: 240 }));
  }
  out.push(...bodyParagraphs(theme, lines, 160));
  return out;
}
