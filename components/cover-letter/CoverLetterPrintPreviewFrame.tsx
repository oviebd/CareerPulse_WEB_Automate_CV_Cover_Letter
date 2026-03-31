'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Logical width — matches export / PDF pipeline (A4 at 96 dpi). */
export const COVER_LETTER_DOC_WIDTH = 794;
/** Fallback height used before content is measured. */
export const COVER_LETTER_DOC_HEIGHT = 1123;

type Props = {
  /** Full URL for the preview iframe (e.g. GET sample or blob: URL). */
  src: string | null;
  title: string;
  className?: string;
  /** When true, dims the preview (e.g. while regenerating HTML). */
  isLoading?: boolean;
  /**
   * Fixed height for the preview container (e.g. 840 or '70vh').
   * When provided the card keeps a stable viewport height and clips overflow.
   * When omitted, the container auto-sizes to the letter content height.
   */
  containerHeight?: number | string;
};

/** Small buffer so the iframe never sits exactly at scrollHeight (avoids 1-px scrollbar). */
const HEIGHT_MEASURE_BUFFER = 4;
/** Minimum card height while content is loading. */
const MIN_PREVIEW_HEIGHT = 200;

/**
 * Inject preview-specific CSS directly into the iframe document.
 *
 * WHY client-side injection instead of server-side:
 *   - The GET preview API has Cache-Control: max-age=60, so server-injected CSS
 *     can arrive stale after a deploy.
 *   - The cover letter templates use `body { width: 210mm; padding: 20mm;
 *     box-sizing: content-box }`.  Total body box = 250 mm ≈ 944 px, which is
 *     wider than the 794 px iframe viewport.  `margin: 0 auto` collapses to 0
 *     because the body overflows, clipping the right ~150 px of content.
 *   - `min-height: 297mm` on body forces a full A4 page height even for a
 *     short letter, causing excessive blank space in the card.
 *
 * Fixes applied:
 *   1. `box-sizing: border-box` → body width 210mm now INCLUDES padding, so it
 *      fits exactly in the 794 px iframe with proper auto-centering.
 *   2. `min-height: 0; height: auto` → body height = actual content height.
 *   3. `html { overflow: hidden }` → no scrollbar inside the iframe.
 */
function injectPreviewOverrides(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.head) return;
    const existing = doc.getElementById('__cl-preview-overrides');
    if (existing) return;
    const style = doc.createElement('style');
    style.id = '__cl-preview-overrides';
    style.textContent = [
      'html{overflow:hidden!important;margin:0!important;padding:0!important;}',
      'body{box-sizing:border-box!important;width:794px!important;',
      'min-height:0!important;height:auto!important;overflow:visible!important;}',
    ].join('');
    doc.head.appendChild(style);
  } catch {
    // cross-origin frames are silently ignored
  }
}

function measureIframeContentHeight(iframe: HTMLIFrameElement): number {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.documentElement) return COVER_LETTER_DOC_HEIGHT;
    // Temporarily expand the iframe so the body is not viewport-constrained;
    // some engines cap scrollHeight to the current viewport height.
    const prevH = iframe.style.height;
    iframe.style.height = '10000px';
    void iframe.offsetHeight;
    try {
      const root = doc.documentElement;
      const body = doc.body;
      const bodyRect = body?.getBoundingClientRect();
      const h = Math.max(
        root.scrollHeight,
        root.offsetHeight,
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        bodyRect ? Math.ceil(bodyRect.height) : 0,
        MIN_PREVIEW_HEIGHT
      );
      return Math.ceil(h) + HEIGHT_MEASURE_BUFFER;
    } finally {
      iframe.style.height = prevH;
    }
  } catch {
    return COVER_LETTER_DOC_HEIGHT;
  }
}

/**
 * Scales a cover letter preview iframe to the container width.
 * Card height follows the actual letter content — no full A4 blank space.
 */
export function CoverLetterPrintPreviewFrame({
  src,
  title,
  className,
  isLoading = false,
  containerHeight,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeDocRoRef = useRef<ResizeObserver | null>(null);
  const [scale, setScale] = useState(0.2);
  const [contentHeight, setContentHeight] = useState(MIN_PREVIEW_HEIGHT);

  /** Schedules several height remeasures so fonts/images don't cause stale values. */
  const scheduleMeasure = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const run = () => setContentHeight(measureIframeContentHeight(iframe));
    run();
    requestAnimationFrame(run);
    requestAnimationFrame(() => requestAnimationFrame(run));
    window.setTimeout(run, 80);
    window.setTimeout(run, 400);
    window.setTimeout(run, 900);
  }, []);

  // Reset height skeleton when src changes.
  useEffect(() => {
    if (!src) return;
    setContentHeight(MIN_PREVIEW_HEIGHT);
  }, [src]);

  // Disconnect observer on unmount.
  useEffect(() => {
    return () => {
      iframeDocRoRef.current?.disconnect();
      iframeDocRoRef.current = null;
    };
  }, []);

  // Track container width → compute scale.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / COVER_LETTER_DOC_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    iframeDocRoRef.current?.disconnect();
    iframeDocRoRef.current = null;

    // Fix width overflow + min-height before measuring.
    injectPreviewOverrides(iframe!);

    scheduleMeasure();
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const remeasure = () => setContentHeight(measureIframeContentHeight(iframe));
      const ro = new ResizeObserver(remeasure);
      ro.observe(doc.body);
      ro.observe(doc.documentElement);
      iframeDocRoRef.current = ro;
      // Re-measure after webfonts finish loading.
      if (typeof doc.fonts?.ready?.then === 'function') {
        void doc.fonts.ready.then(() => {
          injectPreviewOverrides(iframe);
          scheduleMeasure();
        });
      }
    } catch {
      // ignore
    }
  }, [scheduleMeasure]);

  const visualHeight = containerHeight ?? contentHeight * scale;

  return (
    <div ref={wrapRef} className={className}>
      <div
        className="relative w-full overflow-hidden rounded-t-lg bg-slate-100"
        style={{
          minHeight: src ? undefined : MIN_PREVIEW_HEIGHT,
          height: src ? visualHeight : undefined,
        }}
      >
        {src ? (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: COVER_LETTER_DOC_WIDTH,
              height: contentHeight,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={iframeRef}
              title={title}
              src={src}
              className="pointer-events-none block max-w-none border-0"
              width={COVER_LETTER_DOC_WIDTH}
              height={contentHeight}
              loading="lazy"
              onLoad={onIframeLoad}
            />
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center text-xs text-[var(--color-muted)]">
            Loading preview…
          </div>
        )}
        {isLoading && src ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]"
            style={{ height: visualHeight }}
          >
            <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-[var(--color-muted)] shadow-sm">
              Updating…
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
