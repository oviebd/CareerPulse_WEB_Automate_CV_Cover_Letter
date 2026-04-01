/**
 * Extract hyperlinks (hidden & visible) from PDF and DOCX files.
 *
 * PDFs often embed URLs as invisible annotations (clickable text whose
 * href is not part of the visible text stream). DOCX files use `<w:hyperlink>`
 * elements.  This module surfaces those links so the AI extraction prompt can
 * map them to the correct profile fields (LinkedIn, GitHub, portfolio, etc.).
 */

export interface ExtractedHyperlink {
  url: string;
  /** Visible anchor text, if recoverable. */
  text: string;
}

// ---------------------------------------------------------------------------
// PDF hyperlinks via pdfjs-dist (already installed as a dep of pdf-parse)
// ---------------------------------------------------------------------------

export async function extractPdfHyperlinks(
  data: Uint8Array
): Promise<ExtractedHyperlink[]> {
  // pdfjs-dist ships ESM under legacy/build; the legacy build avoids
  // needing a canvas polyfill in Node.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const doc = await pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    // Disable worker so we run in the same thread (server-side).
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise;

  const links: ExtractedHyperlink[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);

    // Annotations contain the hyperlinks.
    const annotations = await page.getAnnotations();
    // Also get text items so we can attempt to recover anchor text by position.
    const textContent = await page.getTextContent();

    for (const ann of annotations) {
      if (ann.subtype !== 'Link' || !ann.url) continue;
      const url = String(ann.url).trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);

      // Try to find text items that overlap the annotation rectangle.
      let anchorText = '';
      if (ann.rect && textContent.items) {
        const [x1, y1, x2, y2] = ann.rect;
        for (const item of textContent.items) {
          if (!('transform' in item) || !('str' in item)) continue;
          const tx = (item as { transform: number[] }).transform[4];
          const ty = (item as { transform: number[] }).transform[5];
          if (tx >= x1 - 2 && tx <= x2 + 2 && ty >= y1 - 2 && ty <= y2 + 2) {
            anchorText += (item as { str: string }).str;
          }
        }
      }

      links.push({ url, text: anchorText.trim() });
    }

    page.cleanup();
  }

  await doc.cleanup();
  await doc.destroy();
  return links;
}

// ---------------------------------------------------------------------------
// DOCX hyperlinks via mammoth HTML conversion
// ---------------------------------------------------------------------------

export async function extractDocxHyperlinks(
  buffer: Buffer
): Promise<ExtractedHyperlink[]> {
  const mammoth = await import('mammoth');
  const { value: html } = await mammoth.default.convertToHtml({ buffer });

  const links: ExtractedHyperlink[] = [];
  const seen = new Set<string>();

  // Match <a href="...">text</a> — good enough for hyperlink extraction.
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].trim();
    const text = m[2].replace(/<[^>]*>/g, '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    links.push({ url, text });
  }

  return links;
}

// ---------------------------------------------------------------------------
// Format for the AI prompt
// ---------------------------------------------------------------------------

export function formatHyperlinksForPrompt(
  links: ExtractedHyperlink[]
): string {
  if (links.length === 0) return '';

  const lines = links.map((l) =>
    l.text ? `- "${l.text}" → ${l.url}` : `- ${l.url}`
  );

  return [
    '',
    'EMBEDDED HYPERLINKS (extracted from the document — these are clickable links that may not appear in the visible text above):',
    ...lines,
  ].join('\n');
}
