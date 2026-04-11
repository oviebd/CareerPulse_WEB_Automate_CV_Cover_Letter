'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** A4 height / width — estimate how many “pages” a tall PNG spans. */
const A4_H_OVER_W = 297 / 210;

interface PreviewPanelProps {
  /** Blob URL for PDF iframe, or a data URL / https URL for PNG image preview. */
  previewSrc: string;
  /** When false, `previewSrc` is rendered as an image (faster live preview). */
  previewIsPdf: boolean;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PreviewPanel(props: PreviewPanelProps) {
  const {
    previewSrc,
    previewIsPdf,
    previewBusy,
    zoom,
    onZoomChange,
    currentPage,
    onPageChange,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pngNatural, setPngNatural] = useState<{ w: number; h: number } | null>(null);

  const scale = zoom / 100;

  const pngPageCount = useMemo(() => {
    if (!pngNatural || pngNatural.w <= 0) return 1;
    const pageH = pngNatural.w * A4_H_OVER_W;
    return Math.max(1, Math.ceil(pngNatural.h / pageH));
  }, [pngNatural]);

  useEffect(() => {
    setPngNatural(null);
  }, [previewSrc, previewIsPdf]);

  const scrollPngToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      if (!el || previewIsPdf) return;
      const pages = pngPageCount;
      const clamped = Math.min(Math.max(1, page), pages);
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (pages <= 1 || maxScroll <= 0) {
        el.scrollTop = 0;
        return;
      }
      el.scrollTop = ((clamped - 1) / (pages - 1)) * maxScroll;
    },
    [previewIsPdf, pngPageCount]
  );

  useEffect(() => {
    if (previewIsPdf || !previewSrc) return;
    scrollPngToPage(currentPage);
  }, [previewIsPdf, previewSrc, currentPage, scrollPngToPage, zoom, pngPageCount]);

  const showPngPages = !previewIsPdf && pngPageCount > 1;

  /** Logical CV width at 96dpi-ish; `maxWidth: 100%` caps to the sidebar. */
  const displayWidthPx = 794 * scale;

  return (
    <aside
      className={cn(
        'glass-panel sticky top-24 h-[calc(100vh-7rem)] w-full rounded-card border border-[var(--color-border)] p-4 shadow-sm xl:w-[630px]'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-2 pt-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live Preview</p>
          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-muted)]">
            <button
              type="button"
              className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1 transition hover:bg-white/[0.1]"
              onClick={() => onZoomChange(Math.max(70, zoom - 10))}
            >
              -
            </button>
            <span className="min-w-[3ch] text-center">{zoom}%</span>
            <button
              type="button"
              className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1 transition hover:bg-white/[0.1]"
              onClick={() => onZoomChange(Math.min(140, zoom + 10))}
            >
              +
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-1"
        >
          <div className="relative w-full rounded-xl border border-[var(--color-border)] bg-slate-50/50 shadow-inner">
            {previewBusy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-400)] border-t-transparent" />
                  <span>Updating preview…</span>
                </div>
              </div>
            ) : null}
            {previewSrc ? (
              <div className="flex w-full justify-center p-3">
                {previewIsPdf ? (
                  <div
                    className="mx-auto shadow-lg"
                    style={{
                      width: `${displayWidthPx}px`,
                      maxWidth: '100%',
                      height: 'min(85vh, 1400px)',
                    }}
                  >
                    <iframe
                      title="CV live preview"
                      src={previewSrc}
                      className="h-full w-full rounded-sm bg-white"
                    />
                  </div>
                ) : (
                  <div
                    className="mx-auto shadow-lg"
                    style={{
                      width: `${displayWidthPx}px`,
                      maxWidth: '100%',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt="CV preview"
                      className="block h-auto w-full bg-white"
                      style={{ objectFit: 'contain' }}
                      onLoad={(e) => {
                        const { naturalWidth, naturalHeight } = e.currentTarget;
                        if (naturalWidth > 0 && naturalHeight > 0) {
                          setPngNatural({ w: naturalWidth, h: naturalHeight });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center p-8 text-sm text-[var(--color-muted)]">
                Preview unavailable
              </div>
            )}
          </div>
          {!previewIsPdf && previewSrc && !previewBusy ? (
            <p className="mt-2 px-1 text-center text-[11px] text-[var(--color-muted)]">
              {showPngPages
                ? `Long CV — about ${pngPageCount} page${pngPageCount > 1 ? 's' : ''}. Scroll the preview or use Previous / Next.`
                : 'Scroll to see the full preview if content is long.'}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-[var(--color-border)] pt-3 font-mono text-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-3 py-1.5 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Previous
          </button>
          <span className="font-medium text-[var(--color-text-primary)]">
            {previewIsPdf
              ? `Page ${currentPage}`
              : showPngPages
                ? `Page ${currentPage} / ${pngPageCount}`
                : `Page ${currentPage}`}
          </span>
          <button
            type="button"
            disabled={!previewIsPdf && currentPage >= pngPageCount}
            className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-3 py-1.5 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() =>
              previewIsPdf
                ? onPageChange(currentPage + 1)
                : onPageChange(Math.min(pngPageCount, currentPage + 1))
            }
          >
            Next
          </button>
        </div>
      </div>
    </aside>
  );
}
