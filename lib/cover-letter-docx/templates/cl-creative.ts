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

export function buildClCreative(
  vars: CoverLetterDocxVars,
  theme: CoverLetterDocxTheme
): (Paragraph | Table)[] {
  const lines = bodyLines(vars.cover_letter_body);
  const content: Paragraph[] = [];

  if (vars.applicant_name) {
    content.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [
          runText(theme, vars.applicant_name, {
            bold: true,
            size: 52,
            color: theme.accent,
          }),
        ],
      })
    );
  }
  const meta = [vars.applicant_email, vars.applicant_phone, vars.date]
    .filter(Boolean)
    .join(' · ');
  if (meta) content.push(para(theme, meta, { size: 19, color: theme.mutedColor }));
  const role = [vars.job_title, vars.company_name].filter(Boolean).join(' @ ');
  if (role) {
    content.push(para(theme, role, { bold: true, spacingBefore: 160, spacingAfter: 200 }));
  }
  content.push(...bodyParagraphs(theme, lines));

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 4, type: WidthType.PERCENTAGE },
              shading: { fill: theme.accent, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: 96, type: WidthType.PERCENTAGE },
              margins: { left: 200, top: 120, bottom: 120, right: 120 },
              children: content,
            }),
          ],
        }),
      ],
    }),
  ];
}
