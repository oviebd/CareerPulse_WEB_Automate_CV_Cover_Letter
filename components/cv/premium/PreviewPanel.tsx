'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  DocumentPrintPreviewFrame,
  DOCUMENT_PREVIEW_A4_HEIGHT,
} from '@/components/shared/DocumentPrintPreviewFrame';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  /** Blob URL for rendered HTML preview. */
  previewSrc: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  stickyTopClass?: string;
}

export function PreviewPanel(props: PreviewPanelProps) {
  const {
    previewSrc,
    previewBusy,
    zoom,
    onZoomChange,
    currentPage,
    onPageChange,
    collapsed = false,
    onToggleCollapse,
    stickyTopClass = 'xl:top-[72px]',
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  const scrollToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const pages = Math.max(1, pageCount);
      const clamped = Math.min(Math.max(1, page), pages);
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (pages <= 1 || maxScroll <= 0) {
        el.scrollTop = 0;
        return;
      }
      el.scrollTop = ((clamped - 1) / (pages - 1)) * maxScroll;
    },
    [pageCount]
  );

  useEffect(() => {
    if (!previewSrc) return;
    scrollToPage(currentPage);
  }, [previewSrc, currentPage, scrollToPage, zoom, pageCount]);

  if (collapsed) {
    return (
      <aside
        className={cn(
          'glass-panel sticky z-10 flex h-12 w-full shrink-0 items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] px-3 shadow-sm backdrop-blur-xl',
          stickyTopClass
        )}
      >
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live preview</p>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          Expand
        </button>
      </aside>
    );
  }

  const showMultiPage = pageCount > 1;

  return (
    <aside
      className={cn(
        'glass-panel sticky z-10 h-[calc(100vh-4.5rem)] w-full rounded-2xl border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-primary-400)] p-4 shadow-[var(--shadow-card)]',
        stickyTopClass
      )}
    >
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)]/80 pb-2 pt-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live preview</p>
          <div className="flex items-center gap-2">
            {onToggleCollapse ? (
              <button
                type="button"
                title="Collapse preview"
                onClick={onToggleCollapse}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] p-1.5 text-[var(--color-muted)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
              >
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-muted)]">
              <button
                type="button"
                className="rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
                onClick={() => onZoomChange(Math.max(70, zoom - 10))}
              >
                -
              </button>
              <span className="min-w-[3ch] text-center">{zoom}%</span>
              <button
                type="button"
                className="rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
                onClick={() => onZoomChange(Math.min(140, zoom + 10))}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pr-1"
        >
          <div className="relative w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-preview-well)] p-3 shadow-inner">
            {previewBusy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-preview-overlay)] text-sm text-[var(--color-muted)] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-400)] border-t-transparent" />
                  <span>Updating preview…</span>
                </div>
              </div>
            ) : null}
            {previewSrc ? (
              <DocumentPrintPreviewFrame
                src={previewSrc}
                title="CV live preview"
                isLoading={previewBusy}
                zoom={zoom}
                onMetricsChange={({ contentHeight }) => {
                  const pages = Math.max(
                    1,
                    Math.ceil(contentHeight / DOCUMENT_PREVIEW_A4_HEIGHT)
                  );
                  setPageCount(pages);
                }}
              />
            ) : (
              <div className="flex min-h-[200px] items-center justify-center p-8 text-sm text-[var(--color-muted)]">
                Preview unavailable
              </div>
            )}
          </div>
          {previewSrc && !previewBusy ? (
            <p className="mt-2 px-1 text-center text-[11px] text-[var(--color-muted)]">
              {showMultiPage
                ? `Long CV — about ${pageCount} page${pageCount > 1 ? 's' : ''}. Scroll the preview or use Previous / Next.`
                : 'Scroll to see the full preview if content is long.'}
            </p>
          ) : null}
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-center gap-4 border-t border-[var(--color-border)] pt-3 font-mono text-xs">
          <button
            type="button"
            disabled={currentPage <= 1}
            className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-3 py-1.5 transition duration-200 hover:bg-[var(--color-control-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Previous
          </button>
          <span className="font-medium text-[var(--color-text-primary)]">
            {showMultiPage
              ? `Page ${currentPage} / ${pageCount}`
              : `Page ${currentPage}`}
          </span>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-3 py-1.5 transition duration-200 hover:bg-[var(--color-control-bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </aside>
  );
}
