/**
 * pdfjs-dist in Node dynamically imports `pdf.worker.mjs` at runtime.
 * Standalone/Docker builds often omit that file, which crashes `/api/extract` on load.
 * We lazy-load pdfjs + worker, register the handler on `globalThis`, and extract text
 * directly — no `pdf-parse` dependency on this path.
 */
import type * as PdfJs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ensureNodeCanvasPolyfills } from '@/lib/node-canvas-polyfills';

type PdfJsModule = typeof PdfJs;

let pdfjsModule: PdfJsModule | null = null;

export async function ensurePdfjsServerReady(): Promise<PdfJsModule> {
  if (pdfjsModule) return pdfjsModule;

  await ensureNodeCanvasPolyfills();

  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);

  globalThis.pdfjsWorker = { WorkerMessageHandler: worker.WorkerMessageHandler };
  if (typeof globalThis.pdfjs === 'undefined') {
    globalThis.pdfjs = pdfjs;
  }

  pdfjsModule = pdfjs;
  return pdfjs;
}

const PDF_LOAD_OPTS = {
  useSystemFonts: true,
  isEvalSupported: false,
  useWorkerFetch: false,
  disableFontFace: true,
} as const;

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await ensurePdfjsServerReady();
  const doc = await pdfjs.getDocument({ data, ...PDF_LOAD_OPTS }).promise;

  const parts: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        if (pageText.trim()) parts.push(pageText);
      } finally {
        page.cleanup();
      }
    }
  } finally {
    await doc.destroy();
  }

  return parts.join('\n\n');
}

declare global {
  // eslint-disable-next-line no-var
  var pdfjsWorker:
    | { WorkerMessageHandler: typeof import('pdfjs-dist/legacy/build/pdf.worker.mjs').WorkerMessageHandler }
    | undefined;
  // eslint-disable-next-line no-var
  var pdfjs: PdfJsModule | undefined;
}
