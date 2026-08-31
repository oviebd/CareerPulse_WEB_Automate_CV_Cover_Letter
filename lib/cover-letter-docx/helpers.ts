import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { CoverLetterDocxTheme } from './types';

export { AlignmentType, TabStopType };

export function runText(
  theme: CoverLetterDocxTheme,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: string; font?: string }
): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    size: opts?.size ?? 22,
    color: opts?.color ?? theme.bodyColor,
    font: opts?.font ?? theme.bodyFont,
  });
}

export function para(
  theme: CoverLetterDocxTheme,
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: string;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    spacingBefore?: number;
    borderBottom?: boolean;
  }
): Paragraph {
  return new Paragraph({
    alignment: opts?.alignment,
    spacing: {
      after: opts?.spacingAfter ?? 120,
      before: opts?.spacingBefore ?? 0,
    },
    border: opts?.borderBottom
      ? {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 18,
            color: theme.accent,
            space: 4,
          },
        }
      : undefined,
    children: [
      runText(theme, text, {
        bold: opts?.bold,
        size: opts?.size,
        color: opts?.color,
      }),
    ],
  });
}

export function bodyParagraphs(
  theme: CoverLetterDocxTheme,
  lines: string[],
  lineHeight = 120
): Paragraph[] {
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: lineHeight },
        children: [runText(theme, line, { size: 22 })],
      })
  );
}

export function headerTableTwoCol(
  theme: CoverLetterDocxTheme,
  left: Paragraph[],
  right: Paragraph[]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: left,
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: noBorder(),
            children: right,
          }),
        ],
      }),
    ],
  });
}

function noBorder() {
  const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: n, bottom: n, left: n, right: n };
}
