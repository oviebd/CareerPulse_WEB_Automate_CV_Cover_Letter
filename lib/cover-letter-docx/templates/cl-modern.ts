import { AlignmentType, Paragraph, type Table } from 'docx';
import {
  bodyParagraphs,
  headerTableTwoCol,
  para,
  runText,
} from '../helpers';
import type { CoverLetterDocxTheme, CoverLetterDocxVars } from '../types';
import { bodyLines } from '../theme';

export function buildClModern(
  vars: CoverLetterDocxVars,
  theme: CoverLetterDocxTheme
): (Paragraph | Table)[] {
  const lines = bodyLines(vars.cover_letter_body);
  const left: Paragraph[] = [
    new Paragraph({
      spacing: { after: 80 },
      border: {
        bottom: {
          style: 'single' as const,
          size: 18,
          color: theme.accent,
          space: 4,
        },
      },
      children: [
        runText(theme, vars.applicant_name || ' ', {
          bold: true,
          size: 36,
          color: theme.accent,
        }),
      ],
    }),
  ];
  const right: Paragraph[] = [];
  if (vars.date) {
    right.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [runText(theme, vars.date, { size: 19, color: theme.mutedColor })],
      })
    );
  }
  if (vars.applicant_email) {
    right.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          runText(theme, vars.applicant_email, { size: 19, color: theme.mutedColor }),
        ],
      })
    );
  }
  if (vars.applicant_phone) {
    right.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          runText(theme, vars.applicant_phone, { size: 19, color: theme.mutedColor }),
        ],
      })
    );
  }

  const roleLine = [vars.job_title, vars.company_name].filter(Boolean).join(' · ');
  const out: (Paragraph | Table)[] = [headerTableTwoCol(theme, left, right)];
  if (roleLine) {
    out.push(para(theme, roleLine, { bold: true, spacingBefore: 200, spacingAfter: 200 }));
  }
  out.push(...bodyParagraphs(theme, lines));
  return out;
}
