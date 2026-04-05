import type { CVData } from '@/types';
import type { CVDiffChange, CVDiffSection } from '@/types';
import { optimisedCvJsonToCvData } from '@/lib/optimise-result';

function normalizeLine(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

/** Flatten CVData into comparable lines per logical section block. */
function linesFromCvData(data: CVData): { section: string; lines: string[] }[] {
  const blocks: { section: string; lines: string[] }[] = [];

  if (data.summary?.trim()) {
    blocks.push({
      section: 'Professional summary',
      lines: [normalizeLine(data.summary)],
    });
  }

  for (const ex of data.experience ?? []) {
    const header = [ex.title, ex.company].filter(Boolean).join(' — ');
    const sub = [ex.location, ex.start_date, ex.end_date]
      .filter(Boolean)
      .join(' · ');
    const lines: string[] = [];
    if (header) lines.push(`Header: ${header}`);
    if (sub) lines.push(`Meta: ${sub}`);
    for (const b of ex.bullets ?? []) {
      const t = normalizeLine(b);
      if (t) lines.push(`• ${t}`);
    }
    if (ex.description?.trim()) {
      lines.push(`Desc: ${normalizeLine(ex.description)}`);
    }
    blocks.push({ section: `Experience — ${header || 'Role'}`, lines });
  }

  for (const ed of data.education ?? []) {
    const header = [ed.degree, ed.institution].filter(Boolean).join(' — ');
    const lines: string[] = [];
    if (header) lines.push(`Header: ${header}`);
    for (const t of [ed.field_of_study, ed.start_date, ed.end_date].filter(Boolean)) {
      lines.push(`Meta: ${t}`);
    }
    if (ed.description?.trim()) lines.push(`Desc: ${normalizeLine(ed.description)}`);
    blocks.push({ section: `Education — ${header || 'Education'}`, lines });
  }

  for (const sg of data.skills ?? []) {
    const items = (sg.items ?? []).map((x) => normalizeLine(x)).filter(Boolean);
    if (items.length) {
      blocks.push({
        section: `Skills — ${sg.category}`,
        lines: items.map((i) => `• ${i}`),
      });
    }
  }

  for (const p of data.projects ?? []) {
    const lines: string[] = [];
    lines.push(`Header: ${p.name}`);
    if (p.description?.trim()) lines.push(`Desc: ${normalizeLine(p.description)}`);
    for (const t of p.tech_stack ?? []) {
      const x = normalizeLine(t);
      if (x) lines.push(`Tech: ${x}`);
    }
    blocks.push({ section: `Project — ${p.name}`, lines });
  }

  return blocks;
}

/** LCS-based line diff — preserves order. */
function diffLineArrays(a: string[], b: string[]): CVDiffChange[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0)
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const out: CVDiffChange[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      out.push({ type: 'unchanged', content: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.push({ type: 'added', content: b[j - 1] });
      j--;
    } else if (i > 0) {
      out.push({ type: 'removed', content: a[i - 1] });
      i--;
    } else {
      out.push({ type: 'added', content: b[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

export function computeCvDiffSections(
  originalJson: string,
  tailoredJson: string
): CVDiffSection[] {
  let orig: CVData;
  let tail: CVData;
  try {
    orig = optimisedCvJsonToCvData(JSON.parse(originalJson) as Record<string, unknown>);
    tail = optimisedCvJsonToCvData(JSON.parse(tailoredJson) as Record<string, unknown>);
  } catch {
    return [];
  }

  const ob = linesFromCvData(orig);
  const tb = linesFromCvData(tail);
  const byKey = new Map<string, string[]>();
  for (const x of tb) {
    byKey.set(x.section, x.lines);
  }

  const sections: CVDiffSection[] = [];
  const seen = new Set<string>();

  for (const o of ob) {
    seen.add(o.section);
    const tLines = byKey.get(o.section) ?? [];
    const changes = diffLineArrays(o.lines, tLines);
    const hasChanges = changes.some((c) => c.type !== 'unchanged');
    sections.push({ sectionName: o.section, changes, hasChanges });
  }

  for (const t of tb) {
    if (seen.has(t.section)) continue;
    const changes = diffLineArrays([], t.lines);
    sections.push({
      sectionName: t.section,
      changes,
      hasChanges: changes.length > 0,
    });
  }

  return sections;
}

export function summarizeDiff(sections: CVDiffSection[]): {
  sectionsChanged: number;
  additions: number;
  removals: number;
} {
  let sectionsChanged = 0;
  let additions = 0;
  let removals = 0;
  for (const s of sections) {
    if (!s.hasChanges) continue;
    sectionsChanged++;
    for (const c of s.changes) {
      if (c.type === 'added') additions++;
      if (c.type === 'removed') removals++;
    }
  }
  return { sectionsChanged, additions, removals };
}
