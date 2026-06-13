'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Logical width — matches export / PDF pipeline (A4 at 96 dpi). */
export const DOCUMENT_PREVIEW_WIDTH = 794;
/** Fallback height used before content is measured. */
export const DOCUMENT_PREVIEW_A4_HEIGHT = 1123;

const HEIGHT_MEASURE_BUFFER = 4;
const MIN_PREVIEW_HEIGHT = 200;

export type DocumentPreviewMetrics = {
  contentHeight: number;
  scale: number;
  visualHeight: number;
};

type Props = {
  /** Full URL for the preview iframe (GET sample, blob:, or srcDoc via blob). */
  src: string | null;
  title: string;
  className?: string;
  isLoading?: boolean;
  /**
   * `document` — natural content height; parent provides scroll (editors, result page).
   * `thumbnail` — fixed viewport clip for template cards.
   */
  variant?: 'document' | 'thumbnail';
  /** Clip height when variant is `thumbnail`. */
  thumbnailHeight?: number | string;
  /** 100 = fit container width. */
  zoom?: number;
  onMetricsChange?: (metrics: DocumentPreviewMetrics) => void;
  /** Run after iframe load to patch template CSS before measuring. */
  injectOverrides?: (iframe: HTMLIFrameElement) => void;
};

function measureIframeContentHeight(iframe: HTMLIFrameElement): number {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.documentElement) return DOCUMENT_PREVIEW_A4_HEIGHT;
    const prevH = iframe.style.height;
    iframe.style.height = '10000px';
    void iframe.offsetHeight;
    try {
      const body = doc.body;
      const bodyRect = body?.getBoundingClientRect();
      // Measure only the body — NOT documentElement. The <html> element fills
      // the iframe viewport (10 000 px during the probe), so root.scrollHeight
      // is always the probe height regardless of actual content.  body.scrollHeight
      // correctly reflects the rendered content including padding and overflow.
      const h = Math.max(
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
    return DOCUMENT_PREVIEW_A4_HEIGHT;
  }
}

/**
 * Scales a document preview iframe to the container width.
 * In `document` mode the frame grows to full content height so a parent scroll
 * container can reveal multi-page documents.
 */
export function DocumentPrintPreviewFrame({
  src,
  title,
  className,
  isLoading = false,
  variant = 'document',
  thumbnailHeight = 300,
  zoom = 100,
  onMetricsChange,
  injectOverrides,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeDocRoRef = useRef<ResizeObserver | null>(null);
  const [baseScale, setBaseScale] = useState(0.2);
  const [contentHeight, setContentHeight] = useState(MIN_PREVIEW_HEIGHT);

  const zoomFactor = zoom / 100;
  const scale = baseScale * zoomFactor;
  const visualHeight = contentHeight * scale;
  const isThumbnail = variant === 'thumbnail';

  const emitMetrics = useCallback(
    (height: number, base: number) => {
      onMetricsChange?.({
        contentHeight: height,
        scale: base * zoomFactor,
        visualHeight: height * base * zoomFactor,
      });
    },
    [onMetricsChange, zoomFactor]
  );

  const scheduleMeasure = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const run = () => {
      const h = measureIframeContentHeight(iframe);
      setContentHeight(h);
      const w = wrapRef.current?.clientWidth ?? 0;
      const base = w > 0 ? w / DOCUMENT_PREVIEW_WIDTH : baseScale;
      emitMetrics(h, base);
    };
    run();
    requestAnimationFrame(run);
    requestAnimationFrame(() => requestAnimationFrame(run));
    window.setTimeout(run, 80);
    window.setTimeout(run, 400);
    window.setTimeout(run, 900);
  }, [baseScale, emitMetrics]);

  useEffect(() => {
    if (!src) return;
    setContentHeight(MIN_PREVIEW_HEIGHT);
  }, [src]);

  useEffect(() => {
    return () => {
      iframeDocRoRef.current?.disconnect();
      iframeDocRoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) {
        const base = w / DOCUMENT_PREVIEW_WIDTH;
        setBaseScale(base);
        emitMetrics(contentHeight, base);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentHeight, emitMetrics]);

  useEffect(() => {
    const w = wrapRef.current?.clientWidth ?? 0;
    if (w > 0) emitMetrics(contentHeight, w / DOCUMENT_PREVIEW_WIDTH);
  }, [zoom, contentHeight, emitMetrics]);

  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    iframeDocRoRef.current?.disconnect();
    iframeDocRoRef.current = null;
    if (!iframe) return;

    injectOverrides?.(iframe);
    scheduleMeasure();

    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      const remeasure = () => {
        const h = measureIframeContentHeight(iframe);
        setContentHeight(h);
        const w = wrapRef.current?.clientWidth ?? 0;
        if (w > 0) emitMetrics(h, w / DOCUMENT_PREVIEW_WIDTH);
      };
      const ro = new ResizeObserver(remeasure);
      ro.observe(doc.body);
      ro.observe(doc.documentElement);
      iframeDocRoRef.current = ro;
      if (typeof doc.fonts?.ready?.then === 'function') {
        void doc.fonts.ready.then(() => {
          injectOverrides?.(iframe);
          scheduleMeasure();
        });
      }
    } catch {
      // ignore cross-origin
    }
  }, [injectOverrides, scheduleMeasure, emitMetrics]);

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      <div
        className={cn(
          'relative w-full bg-slate-100',
          isThumbnail ? 'overflow-hidden rounded-t-lg' : 'rounded-lg'
        )}
        style={
          isThumbnail
            ? {
                minHeight: src ? undefined : MIN_PREVIEW_HEIGHT,
                height: src ? thumbnailHeight : undefined,
              }
            : {
                minHeight: src ? undefined : MIN_PREVIEW_HEIGHT,
                height: src ? visualHeight : undefined,
              }
        }
      >
        {src ? (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: DOCUMENT_PREVIEW_WIDTH,
              height: contentHeight,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              ref={iframeRef}
              title={title}
              src={src}
              className="pointer-events-none block max-w-none border-0 bg-white"
              width={DOCUMENT_PREVIEW_WIDTH}
              height={contentHeight}
              onLoad={onIframeLoad}
            />
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center text-xs text-[var(--color-muted)]">
            Loading preview…
          </div>
        )}
        {isLoading && src ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
            <span className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-[var(--color-muted)] shadow-sm">
              Updating…
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
