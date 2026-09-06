/** Markdown-ish parsing for interview prep rich text (no React). */

export type RichTextBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; language?: string; text: string };

const UL_RE = /^[-*•]\s+/;
const OL_RE = /^\d+\.\s+/;
const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const LANG_ONLY_RE =
  /^(swift|javascript|typescript|python|java|kotlin|go|rust|ruby|php|c\+\+|cpp|csharp|sql|bash|shell|json|yaml|html|css|tsx|jsx)$/i;
const CODE_START_RE =
  /^(func|function|let|var|val|const|class|struct|enum|protocol|extension|import|export|from|def|async|await|public|private|internal|static|final|override|mutating|guard|return|if|else|for|while|switch|case|do|try|catch|throw|throws|typealias|interface|implements|extends|package|using|fn|typedef|#include|#import)\b/;

function stripListPrefix(line: string): string {
  return line.replace(UL_RE, '').replace(OL_RE, '').trim();
}

function parseFencedBlocks(source: string): Array<{ kind: 'text' | 'code'; value: string; language?: string }> {
  const segments: Array<{ kind: 'text' | 'code'; value: string; language?: string }> = [];
  const re = /```([\w+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', value: source.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: 'code',
      language: match[1]?.trim() || undefined,
      value: match[2].replace(/\n$/, ''),
    });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < source.length) {
    segments.push({ kind: 'text', value: source.slice(lastIndex) });
  }

  return segments.length ? segments : [{ kind: 'text', value: source }];
}

function looksLikeCodeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (HEADING_RE.test(t) || UL_RE.test(t) || OL_RE.test(t)) return false;
  if (LANG_ONLY_RE.test(t)) return false;
  if (CODE_START_RE.test(t) || /^@\w+/.test(t)) return true;
  if (/^[{}()[\],;]+$/.test(t)) return true;
  if (/^[A-Za-z_]\w*\s*[=:]\s*\S/.test(t)) return true;
  if (/^[A-Za-z_]\w*\s*\(.*\)\s*[{;]?\s*$/.test(t)) return true;
  return false;
}

function shouldEmitUnfencedCode(codeLines: string[]): boolean {
  if (codeLines.length >= 2) return true;
  const first = codeLines[0]?.trim() ?? '';
  return CODE_START_RE.test(first) || /^@\w+/.test(first);
}

function parseTextBlocks(text: string): RichTextBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: RichTextBlock[] = [];
  let paragraph: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', lines: [...paragraph] });
    paragraph = [];
  }

  function flushUl() {
    if (!ul.length) return;
    blocks.push({ type: 'ul', items: [...ul] });
    ul = [];
  }

  function flushOl() {
    if (!ol.length) return;
    blocks.push({ type: 'ol', items: [...ol] });
    ol = [];
  }

  function flushAll() {
    flushParagraph();
    flushUl();
    flushOl();
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    const heading = HEADING_RE.exec(trimmed);
    if (heading) {
      flushAll();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    if (LANG_ONLY_RE.test(trimmed)) {
      flushAll();
      const language = trimmed.toLowerCase();
      const codeLines: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextRaw = lines[cursor];
        const nextTrimmed = nextRaw.trim();
        if (!nextTrimmed) break;
        if (HEADING_RE.test(nextTrimmed) || UL_RE.test(nextRaw) || OL_RE.test(nextRaw)) break;
        if (LANG_ONLY_RE.test(nextTrimmed) && codeLines.length > 0) break;
        codeLines.push(nextRaw.replace(/\s+$/, ''));
        cursor += 1;
      }
      if (codeLines.length > 0 && codeLines.some((codeLine) => looksLikeCodeLine(codeLine))) {
        blocks.push({ type: 'code', language, text: codeLines.join('\n') });
        index = cursor - 1;
        continue;
      }
    }

    if (UL_RE.test(line)) {
      flushParagraph();
      flushOl();
      ul.push(stripListPrefix(line));
      continue;
    }

    if (OL_RE.test(line)) {
      flushParagraph();
      flushUl();
      ol.push(stripListPrefix(line));
      continue;
    }

    if (looksLikeCodeLine(line) && paragraph.length === 0 && ul.length === 0 && ol.length === 0) {
      const codeLines: string[] = [line.replace(/\s+$/, '')];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextRaw = lines[cursor];
        if (!nextRaw.trim()) break;
        if (HEADING_RE.test(nextRaw.trim()) || UL_RE.test(nextRaw) || OL_RE.test(nextRaw)) break;
        if (!looksLikeCodeLine(nextRaw) && !/^\s+/.test(nextRaw)) break;
        codeLines.push(nextRaw.replace(/\s+$/, ''));
        cursor += 1;
      }
      if (shouldEmitUnfencedCode(codeLines)) {
        flushAll();
        blocks.push({ type: 'code', text: codeLines.join('\n') });
        index = cursor - 1;
        continue;
      }
    }

    flushUl();
    flushOl();
    paragraph.push(trimmed);
  }

  flushAll();
  return blocks;
}

export function parseRichTextBlocks(source: string): RichTextBlock[] {
  const trimmed = source.trim();
  if (!trimmed) return [];

  const blocks: RichTextBlock[] = [];
  for (const segment of parseFencedBlocks(trimmed)) {
    if (segment.kind === 'code') {
      blocks.push({ type: 'code', language: segment.language, text: segment.value });
      continue;
    }
    blocks.push(...parseTextBlocks(segment.value));
  }
  return blocks;
}
