/**
 * pdfjs-dist expects browser DOM APIs in Node. When webpack bundles pdfjs into
 * `.next/server/chunks`, its internal `require("@napi-rs/canvas")` resolves from
 * the chunk path and fails. Load canvas here first and polyfill globals.
 */
export async function ensureNodeCanvasPolyfills(): Promise<void> {
  if (globalThis.DOMMatrix && globalThis.ImageData && globalThis.Path2D) {
    return;
  }

  const canvas = await import('@napi-rs/canvas');

  if (!globalThis.DOMMatrix && canvas.DOMMatrix) {
    globalThis.DOMMatrix = canvas.DOMMatrix as typeof DOMMatrix;
  }
  if (!globalThis.ImageData && canvas.ImageData) {
    globalThis.ImageData = canvas.ImageData as typeof ImageData;
  }
  if (!globalThis.Path2D && canvas.Path2D) {
    globalThis.Path2D = canvas.Path2D as typeof Path2D;
  }
  if (!globalThis.navigator?.language) {
    globalThis.navigator = {
      language: 'en-US',
      platform: '',
      userAgent: '',
    } as Navigator;
  }
}
