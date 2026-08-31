import { AlignmentType, Paragraph, TabStopType, type Table } from 'docx';
import {
  bodyParagraphs,
  para,
  runText,
} from '../helpers';
import type { CoverLetterDocxTheme, CoverLetterDocxVars } from '../types';
import { bodyLines } from '../theme';

export function buildClClassic(
  vars: CoverLetterDocxVars,
  theme: CoverLetterDocxTheme
): (Paragraph | Table)[] {
  const lines = bodyLines(vars.cover_letter_body);
  const out: Paragraph[] = [];

  if (vars.date) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [
          runText(theme, vars.date, { size: 20, color: theme.mutedColor }),
        ],
      })
    );
  }

  if (vars.applicant_name) {
    out.push(para(theme, vars.applicant_name, { bold: true, size: 24 }));
  }
  const contact = [
    vars.applicant_email,
    vars.applicant_phone,
    vars.applicant_location,
    vars.applicant_linkedin,
  ]
    .filter(Boolean)
    .join(' · ');
  if (contact) {
    out.push(para(theme, contact, { size: 19, color: theme.mutedColor }));
  }

  if (vars.company_name) {
    out.push(para(theme, vars.company_name, { bold: true, spacingBefore: 200 }));
  }
  if (vars.job_title) {
    out.push(para(theme, `Re: ${vars.job_title}`, { spacingAfter: 200 }));
  }

  out.push(...bodyParagraphs(theme, lines));
  out.push(para(theme, 'Sincerely,', { spacingBefore: 240 }));
  if (vars.applicant_name) {
    out.push(para(theme, vars.applicant_name, { bold: true }));
  }
  return out;
}
