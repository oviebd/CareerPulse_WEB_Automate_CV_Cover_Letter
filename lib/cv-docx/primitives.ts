import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  ShadingType,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { DocxBlock, DocxTheme } from './types';

export function twipPct(pct: number, total = 9360): number {
  return Math.round((total * pct) / 100);
}

export function run(
  theme: DocxTheme,
  text: string,
  opts?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
    font?: string;
    allCaps?: boolean;
  }
): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    italics: opts?.italics,
    size: opts?.size ?? 20,
    color: opts?.color ?? theme.bodyColor,
    font: opts?.font ?? theme.bodyFont,
    allCaps: opts?.allCaps,
  });
}

export function sectionHeading(theme: DocxTheme, title: string): Paragraph {
  const display = theme.sectionTitleUppercase ? title.toUpperCase() : title;
  const border = theme.minimalDecor
    ? undefined
    : {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: theme.accent,
          space: 2,
        },
      };
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border,
    children: [
      run(theme, display, {
        bold: true,
        size: 22,
        color: theme.minimalDecor ? theme.bodyColor : theme.accent,
        font: theme.headingFont,
      }),
    ],
  });
}

export function sidebarHeading(theme: DocxTheme, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [
      run(theme, title.toUpperCase(), {
        bold: true,
        size: 18,
        color: theme.accent,
        font: theme.headingFont,
      }),
    ],
  });
}

export function entryHeader(
  theme: DocxTheme,
  left: string,
  right: string,
  opts?: { muted?: boolean; inSidebar?: boolean; compact?: boolean }
): Paragraph {
  const bodyColor = opts?.inSidebar ? theme.sidebarText : theme.bodyColor;
  const mutedColor = opts?.inSidebar ? theme.sidebarText : theme.mutedColor;
  return new Paragraph({
    spacing: { before: opts?.compact ? 80 : 120, after: 20 },
    tabStops: opts?.inSidebar
      ? undefined
      : [{ type: TabStopType.RIGHT, position: 9360 }],
    children: opts?.inSidebar
      ? [
          run(theme, left, { bold: true, size: 18, color: bodyColor }),
          ...(right
            ? [
                run(theme, ` — ${right}`, {
                  size: 16,
                  color: mutedColor,
                }),
              ]
            : []),
        ]
      : [
          run(theme, left, { bold: true, size: 22, color: bodyColor }),
          new TextRun({
            text: right ? `\t${right}` : '',
            size: 18,
            color: opts?.muted !== false ? mutedColor : bodyColor,
            font: theme.bodyFont,
          }),
        ],
  });
}

export function subline(
  theme: DocxTheme,
  text: string,
  color?: string,
  opts?: { inSidebar?: boolean }
): Paragraph {
  const defaultColor = opts?.inSidebar ? theme.sidebarText : theme.mutedColor;
  return new Paragraph({
    spacing: { after: opts?.inSidebar ? 40 : 20 },
    children: [
      run(theme, text, {
        size: opts?.inSidebar ? 16 : 19,
        color: color ?? defaultColor,
      }),
    ],
  });
}

export function bullet(theme: DocxTheme, text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [run(theme, text, { size: 20 })],
  });
}

export function bodyParagraph(theme: DocxTheme, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [run(theme, text, { size: 20 })],
  });
}

export function labeledLine(
  theme: DocxTheme,
  label: string,
  value: string
): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      run(theme, `${label}: `, { bold: true, size: 20 }),
      run(theme, value, { size: 20 }),
    ],
  });
}

export function centeredLine(
  theme: DocxTheme,
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: string;
    font?: string;
    after?: number;
  }
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: opts?.after ?? 20 },
    children: [
      run(theme, text, {
        bold: opts?.bold,
        size: opts?.size,
        color: opts?.color,
        font: opts?.font,
      }),
    ],
  });
}

const RATING_LABELS = ['', 'Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert'];

export function skillBarBlock(
  theme: DocxTheme,
  name: string,
  rating: number,
  opts?: { inSidebar?: boolean; showLabel?: boolean }
): DocxBlock[] {
  const pct = Math.min(100, Math.max(8, rating * 20));
  const textColor = opts?.inSidebar ? theme.sidebarText : theme.bodyColor;
  const label = RATING_LABELS[Math.min(5, Math.max(1, rating))] ?? '';
  const barTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: pct, type: WidthType.PERCENTAGE },
            shading: { fill: theme.accent, type: ShadingType.CLEAR },
            borders: noBorders(),
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [],
              }),
            ],
          }),
          new TableCell({
            width: { size: 100 - pct, type: WidthType.PERCENTAGE },
            shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
            borders: noBorders(),
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  const headerChildren = [
    run(theme, name, { size: 18, color: textColor, bold: true }),
  ];
  if (opts?.showLabel && label) {
    headerChildren.push(
      run(theme, `  ${label}`, { size: 16, color: theme.mutedColor })
    );
  }
  return [
    new Paragraph({
      spacing: { before: 60, after: 20 },
      children: headerChildren,
    }),
    barTable,
    new Paragraph({ spacing: { after: 60 }, children: [] }),
  ];
}

/** @deprecated Use skillBarBlock for table-based bars. */
export function skillBarParagraph(
  theme: DocxTheme,
  name: string,
  rating: number
): Paragraph {
  const blocks = skillBarBlock(theme, name, rating);
  return blocks[0] as Paragraph;
}

export function skillDotsParagraph(
  theme: DocxTheme,
  name: string,
  rating: number
): Paragraph {
  const r = Math.min(5, Math.max(1, rating));
  const dots = '●'.repeat(r) + '○'.repeat(5 - r);
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      run(theme, `${name} `, { size: 18 }),
      run(theme, dots, { size: 18, color: theme.accent }),
    ],
  });
}

export function chipParagraph(theme: DocxTheme, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 40 },
    children: [
      run(theme, text, {
        size: 18,
        color: theme.accent,
        font: theme.templateId === 'technical' ? 'Courier New' : theme.bodyFont,
      }),
    ],
  });
}

export function interestsTags(theme: DocxTheme, items: string[]): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      run(theme, items.join('  ·  '), { size: 18, color: theme.mutedColor }),
    ],
  });
}

/** Borderless two-column layout table (sidebar | main). */
export function twoColumnTable(
  theme: DocxTheme,
  sidebarBlocks: DocxBlock[],
  mainBlocks: DocxBlock[],
  opts?: { sidebarFirst?: boolean }
): Table {
  const sidebarFirst = opts?.sidebarFirst !== false;
  const sidebarCell = shadedCell(theme, sidebarBlocks, theme.sidebarBg);
  const mainCell = plainCell(mainBlocks);
  const leftPct = theme.sidebarWidthPct;
  const rightPct = 100 - leftPct;
  const row = new TableRow({
    children: sidebarFirst
      ? [
          new TableCell({
            width: { size: twipPct(leftPct), type: WidthType.DXA },
            borders: noBorders(),
            shading: { fill: theme.sidebarBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: sidebarCell,
          }),
          new TableCell({
            width: { size: twipPct(rightPct), type: WidthType.DXA },
            borders: noBorders(),
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: mainCell,
          }),
        ]
      : [
          new TableCell({
            width: { size: twipPct(rightPct), type: WidthType.DXA },
            borders: noBorders(),
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: mainCell,
          }),
          new TableCell({
            width: { size: twipPct(leftPct), type: WidthType.DXA },
            borders: noBorders(),
            shading: { fill: theme.sidebarBg, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: sidebarCell,
          }),
        ],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [row],
  });
}

export function headerBandTable(
  theme: DocxTheme,
  blocks: DocxBlock[]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: theme.accent, type: ShadingType.CLEAR },
            borders: noBorders(),
            children: blocks as Paragraph[],
          }),
        ],
      }),
    ],
  });
}

export function europassHeaderBar(theme: DocxTheme, name: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: '003399', type: ShadingType.CLEAR },
            borders: noBorders(),
            children: [
              new Paragraph({
                spacing: { before: 120, after: 120 },
                children: [
                  run(theme, name, {
                    bold: true,
                    size: 36,
                    color: 'FFFFFF',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

export function competenciesGrid(
  theme: DocxTheme,
  groups: { category: string; items: string[] }[]
): Table {
  const cols = 3;
  const rows: TableRow[] = [];
  for (let i = 0; i < groups.length; i += cols) {
    const slice = groups.slice(i, i + cols);
    rows.push(
      new TableRow({
        children: slice.map(
          (g) =>
            new TableCell({
              borders: noBorders(),
              width: { size: twipPct(100 / cols), type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    run(theme, g.category, { bold: true, size: 18 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    run(theme, g.items.join(', '), { size: 18 }),
                  ],
                }),
              ],
            })
        ),
      })
    );
  }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows,
  });
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return {
    top: none,
    bottom: none,
    left: none,
    right: none,
    insideHorizontal: none,
    insideVertical: none,
  };
}

function shadedCell(
  theme: DocxTheme,
  blocks: DocxBlock[],
  fill: string
): (Paragraph | Table)[] {
  return blocks.length
    ? (blocks as (Paragraph | Table)[])
    : [new Paragraph({ children: [run(theme, ' ', { size: 8 })] })];
}

function plainCell(blocks: DocxBlock[]): (Paragraph | Table)[] {
  return blocks.length
    ? (blocks as (Paragraph | Table)[])
    : [new Paragraph({ children: [] })];
}

export function sidebarCellWrapper(
  theme: DocxTheme,
  blocks: DocxBlock[]
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: theme.sidebarBg, type: ShadingType.CLEAR },
            borders: noBorders(),
            verticalAlign: VerticalAlign.TOP,
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: blocks as Paragraph[],
          }),
        ],
      }),
    ],
  });
}

export function accentLeftStripeTable(
  theme: DocxTheme,
  blocks: DocxBlock[],
  stripeTwip = 360
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: stripeTwip, type: WidthType.DXA },
            shading: { fill: theme.accent, type: ShadingType.CLEAR },
            borders: noBorders(),
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            borders: noBorders(),
            margins: { left: 200 },
            children: blocks as Paragraph[],
          }),
        ],
      }),
    ],
  });
}

export function timelineExperienceBlock(
  theme: DocxTheme,
  company: string,
  role: string,
  dates: string,
  bullets: string[]
): DocxBlock[] {
  const out: DocxBlock[] = [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      border: {
        left: {
          style: BorderStyle.SINGLE,
          size: 24,
          color: theme.accent,
          space: 8,
        },
      },
      indent: { left: 200 },
      children: [
        run(theme, company, { bold: true, size: 22 }),
        run(theme, `  ·  ${dates}`, { size: 18, color: theme.mutedColor }),
      ],
    }),
  ];
  if (role) out.push(subline(theme, role));
  for (const b of bullets) out.push(bullet(theme, b));
  return out;
}
