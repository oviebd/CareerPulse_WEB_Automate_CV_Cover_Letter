import {
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  WidthType,
} from 'docx';
import { getVisibleSections } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';
import type { DocxBlock, DocxTheme } from '../types';
import {
  buildEducation,
  buildLanguages,
  buildSection,
} from '../sections/builders';
import { europassHeaderBar, run, sectionHeading, subline } from '../primitives';
import { linksLine } from '../sections/builders';
import { dateRange } from '../utils';

export function buildEuropassLayout(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  const name = cvData.personal.fullName?.trim() ?? 'CV';
  blocks.push(europassHeaderBar(theme, name));

  const p = cvData.personal;
  blocks.push(sectionHeading(theme, 'Personal information'));
  const infoRows: [string, string][] = [];
  if (p.email) infoRows.push(['Email', p.email]);
  if (p.phone) infoRows.push(['Phone', p.phone]);
  if (p.location) infoRows.push(['Location', p.location]);
  if (cvData.postalAddress) infoRows.push(['Address', cvData.postalAddress]);
  if (p.dateOfBirth) infoRows.push(['Date of birth', p.dateOfBirth]);
  if (p.nationality) infoRows.push(['Nationality', p.nationality]);
  if (infoRows.length) {
    blocks.push(infoTable(theme, infoRows));
  }

  const ctx = { cvData, theme };
  for (const key of getVisibleSections('europass', cvData)) {
    if (key === 'personal') continue;
    if (key === 'experience') {
      blocks.push(...buildEuropassTimeline(cvData, theme, 'Work experience'));
    } else if (key === 'education') {
      blocks.push(...buildEuropassTimelineEducation(cvData, theme));
    } else if (key === 'languages') {
      blocks.push(...buildEuropassLanguages(cvData, theme));
    } else {
      blocks.push(...buildSection(key, ctx));
    }
  }

  const links = linksLine(cvData);
  if (links) blocks.push(subline(theme, links));

  return blocks;
}

function infoTable(
  theme: DocxTheme,
  rows: [string, string][]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'E8EEF7', type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [run(theme, label, { bold: true, size: 18 })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [run(theme, value, { size: 18 })],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function buildEuropassTimeline(
  cvData: CVData,
  theme: DocxTheme,
  title: string
): DocxBlock[] {
  if (!(cvData.experience ?? []).length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, title)];
  const rows = (cvData.experience ?? []).map((e) => [
    dateRange(e.startDate, e.endDate, e.current),
    [e.role, e.company, ...(e.bullets ?? [])].filter(Boolean).join('\n'),
  ] as [string, string]);
  out.push(timelineTable(theme, rows));
  return out;
}

function buildEuropassTimelineEducation(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  return buildEducation({ cvData, theme });
}

function buildEuropassLanguages(
  cvData: CVData,
  theme: DocxTheme
): DocxBlock[] {
  const langs = cvData.languages ?? [];
  if (!langs.length) return [];
  const out: DocxBlock[] = [sectionHeading(theme, 'Language skills')];
  const hasCefr = langs.some((l) => l.cefr);
  if (hasCefr) {
    out.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['', 'Listening', 'Reading', 'Spoken', 'Writing'].map(
              (h) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        run(theme, h, { bold: true, size: 16 }),
                      ],
                    }),
                  ],
                })
            ),
          }),
          ...langs.map((l) =>
            new TableRow({
              children: [
                l.name,
                l.cefr?.listening ?? '',
                l.cefr?.reading ?? '',
                l.cefr?.spoken ?? '',
                l.cefr?.writing ?? '',
              ].map((v) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [run(theme, v, { size: 16 })],
                    }),
                  ],
                })
              ),
            })
          ),
        ],
      })
    );
  } else {
    out.push(...buildLanguages({ cvData, theme }));
  }
  return out;
}

function timelineTable(
  theme: DocxTheme,
  rows: [string, string][]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([dates, body]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    run(theme, dates, { size: 16, color: theme.mutedColor }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 78, type: WidthType.PERCENTAGE },
              children: body.split('\n').map(
                (line) =>
                  new Paragraph({
                    children: [run(theme, line, { size: 18 })],
                  })
              ),
            }),
          ],
        })
    ),
  });
}
