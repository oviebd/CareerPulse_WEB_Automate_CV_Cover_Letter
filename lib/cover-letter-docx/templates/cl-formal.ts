import {
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';
import { bodyParagraphs, para, runText } from '../helpers';
import type { CoverLetterDocxTheme, CoverLetterDocxVars } from '../types';
import { bodyLines } from '../theme';

export function buildClFormal(
  vars: CoverLetterDocxVars,
  theme: CoverLetterDocxTheme
): (Paragraph | Table)[] {
  const lines = bodyLines(vars.cover_letter_body);
  const out: (Paragraph | Table)[] = [];

  out.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              borders: {
                top: { style: 'single', size: 6, color: theme.accent },
                bottom: { style: 'single', size: 6, color: theme.accent },
                left: { style: 'single', size: 6, color: theme.accent },
                right: { style: 'single', size: 6, color: theme.accent },
              },
              children: [
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    runText(theme, 'Professional correspondence', {
                      bold: true,
                      size: 20,
                      color: theme.accent,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [
                    runText(theme, vars.applicant_name || ' ', {
                      bold: true,
                      size: 28,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  if (vars.date) out.push(para(theme, vars.date, { spacingBefore: 200 }));
  if (vars.company_name) out.push(para(theme, vars.company_name, { bold: true }));
  if (vars.job_title) out.push(para(theme, `Re: ${vars.job_title}`));
  const contact = [vars.applicant_email, vars.applicant_phone, vars.applicant_location]
    .filter(Boolean)
    .join(' · ');
  if (contact) out.push(para(theme, contact, { size: 19, color: theme.mutedColor }));

  out.push(...bodyParagraphs(theme, lines));
  out.push(para(theme, 'Yours faithfully,', { spacingBefore: 240 }));
  if (vars.applicant_name) {
    out.push(para(theme, vars.applicant_name, { bold: true }));
  }
  return out;
}
