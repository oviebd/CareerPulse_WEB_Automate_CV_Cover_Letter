import mammoth from 'mammoth';
import { assertFileSize, validatePdfOrDocx } from '@/lib/file-magic';
import {
  extractPdfHyperlinks,
  extractDocxHyperlinks,
  formatHyperlinksForPrompt,
} from '@/lib/cv-hyperlinks';
import { extractPdfText } from '@/lib/pdfjs-server';

export type DocumentTextExtractError =
  | 'invalid_file_type'
  | 'pdf_parse_failed'
  | 'empty_document';

export type DocumentTextExtractResult =
  | {
      rawText: string;
      hyperlinkPromptSection: string;
      kind: 'pdf' | 'docx';
    }
  | { error: DocumentTextExtractError };

/** Whether a signed storage URL is on this app. */
export function isAllowedStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const appHost = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
      : null;
    const allowedHosts = [appHost, 'localhost:3000'].filter(Boolean);
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      allowedHosts.includes(parsed.host)
    );
  } catch {
    return false;
  }
}

/**
 * Validate magic bytes and extract plain text (+ optional hyperlink prompt section)
 * from a PDF or DOCX buffer. Shared by CV and cover-letter extract routes.
 */
export async function extractDocumentTextFromBuffer(
  buf: Buffer
): Promise<DocumentTextExtractResult> {
  assertFileSize(buf.length);
  const kind = validatePdfOrDocx(buf);
  if (!kind) {
    return { error: 'invalid_file_type' };
  }

  let rawText = '';
  let hyperlinkPromptSection = '';
  const uint8 = new Uint8Array(buf);

  if (kind === 'pdf') {
    try {
      const [text, hyperlinks] = await Promise.all([
        extractPdfText(uint8),
        extractPdfHyperlinks(uint8).catch(() => []),
      ]);
      rawText = text;
      hyperlinkPromptSection = formatHyperlinksForPrompt(hyperlinks);
    } catch (e) {
      console.error('PDF text extraction failed', e);
      return { error: 'pdf_parse_failed' };
    }
  } else {
    try {
      const [textResult, hyperlinks] = await Promise.all([
        mammoth.extractRawText({ buffer: buf }),
        extractDocxHyperlinks(buf).catch(() => []),
      ]);
      rawText = textResult.value;
      hyperlinkPromptSection = formatHyperlinksForPrompt(hyperlinks);
    } catch (e) {
      console.error('DOCX text extraction failed', e);
      return { error: 'pdf_parse_failed' };
    }
  }

  if (!rawText.trim()) {
    return { error: 'empty_document' };
  }

  return { rawText, hyperlinkPromptSection, kind };
}
