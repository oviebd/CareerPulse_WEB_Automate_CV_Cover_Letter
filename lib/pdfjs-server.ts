/**
 * pdfjs-dist in Node tries to dynamically import `pdf.worker.mjs` beside `pdf.mjs`.
 * Next.js standalone output often omits that file, which breaks CV upload PDF parsing.
 * Statically importing the worker handler registers it on `globalThis` so no runtime
 * worker file lookup is needed, and the worker module is traced into the bundle.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

declare global {
  // eslint-disable-next-line no-var
  var pdfjsWorker: { WorkerMessageHandler: typeof WorkerMessageHandler } | undefined;
  // eslint-disable-next-line no-var
  var pdfjs: typeof import('pdfjs-dist/legacy/build/pdf.mjs') | undefined;
}

let configured = false;

export async function ensurePdfjsServerReady(): Promise<typeof pdfjs> {
  if (!configured) {
    globalThis.pdfjsWorker = { WorkerMessageHandler };
    if (typeof globalThis.pdfjs === 'undefined') {
      globalThis.pdfjs = pdfjs;
    }
    configured = true;
  }
  return pdfjs;
}
