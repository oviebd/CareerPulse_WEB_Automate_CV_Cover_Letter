'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DocumentPrintPreviewFrame,
  DOCUMENT_PREVIEW_A4_HEIGHT,
} from '@/components/shared/DocumentPrintPreviewFrame';
import { cn } from '@/lib/utils';

function injectCVPreviewOverrides(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.head) return;
    const existing = doc.getElementById('__cv-preview-overrides');
    if (existing) return;
    const style = doc.createElement('style');
    style.id = '__cv-preview-overrides';
    style.textContent =
      'html{height:auto!important;overflow:hidden!important;}' +
      'body{min-height:0!important;height:auto!important;}' +
      '.cv-sidebar,.cv-two-col,' +
      '.amber-grid,.golden-grid,.midnight-grid,.ocean-grid,' +
      '.violet-wrap,.violet-side,.violet-side-main{min-height:0!important;}';
    doc.head.appendChild(style);
  } catch {
    /* cross-origin */
  }
}

interface PreviewPanelProps {
  previewSrc: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  stickyTopClass?: string;
  mobileSheetOpen?: boolean;
  onMobileSheetClose?: () => void;
  footerSlot?: React.ReactNode;
  /** When true, only render the mobile bottom sheet (no desktop aside). */
  mobileOnly?: boolean;
  /** When true, only render the desktop aside (no mobile sheet). */
  desktopOnly?: boolean;
}

function PreviewContent({
  previewSrc,
  previewBusy,
  zoom,
  onZoomChange,
  currentPage,
  onPageChange,
  scrollRef,
  onPageCountChange,
}: {
  previewSrc: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onPageCountChange: (count: number) => void;
}) {
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
    [pageCount, scrollRef]
  );

  useEffect(() => {
    if (!previewSrc) return;
    scrollToPage(currentPage);
  }, [previewSrc, currentPage, scrollToPage, zoom, pageCount]);

  const showMultiPage = pageCount > 1;

  return (
    <>
      <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border)]/80 pb-2">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live preview</p>
          <p className="text-[11px] text-[var(--color-muted)]">This is how your PDF will look.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-muted)]">
          <Tooltip content="Zoom out">
            <button
              type="button"
              aria-label="Zoom out"
              className="rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
              onClick={() => onZoomChange(Math.max(70, zoom - 10))}
            >
              -
            </button>
          </Tooltip>
          <span className="min-w-[3ch] text-center" aria-label={`Zoom ${zoom} percent`}>
            {zoom}%
          </span>
          <Tooltip content="Zoom in">
            <button
              type="button"
              aria-label="Zoom in"
              className="rounded-btn border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
              onClick={() => onZoomChange(Math.min(140, zoom + 10))}
            >
              +
            </button>
          </Tooltip>
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
              injectOverrides={injectCVPreviewOverrides}
              onMetricsChange={({ contentHeight }) => {
                const pages = Math.max(1, Math.ceil(contentHeight / DOCUMENT_PREVIEW_A4_HEIGHT));
                setPageCount(pages);
                onPageCountChange(pages);
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
          {showMultiPage ? `Page ${currentPage} / ${pageCount}` : `Page ${currentPage}`}
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
    </>
  );
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
    stickyTopClass = 'md:top-[72px]',
    mobileSheetOpen,
    onMobileSheetClose,
    footerSlot,
    mobileOnly = false,
    desktopOnly = false,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setPageCount] = useState(1);

  const panelInner = (
    <PreviewContent
      previewSrc={previewSrc}
      previewBusy={previewBusy}
      zoom={zoom}
      onZoomChange={onZoomChange}
      currentPage={currentPage}
      onPageChange={onPageChange}
      scrollRef={scrollRef}
      onPageCountChange={setPageCount}
    />
  );

  if (!mobileOnly && collapsed) {
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
          aria-label="Show live preview"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] px-2 py-1 text-xs font-medium text-[var(--color-muted)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          Expand
        </button>
      </aside>
    );
  }

  return (
    <>
      {!mobileOnly ? (
        <aside
          className={cn(
            'glass-panel sticky z-10 flex h-[calc(100vh-4.5rem)] w-full flex-col rounded-2xl border border-[var(--color-border)] border-l-[3px] border-l-[var(--color-primary-400)] p-4 shadow-[var(--shadow-card)]',
            stickyTopClass,
            desktopOnly === false && 'hidden md:flex'
          )}
        >
          {onToggleCollapse ? (
            <div className="mb-2 flex justify-end">
              <Tooltip content="Hide preview">
                <button
                  type="button"
                  aria-label="Hide preview"
                  onClick={onToggleCollapse}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)] p-1.5 text-[var(--color-muted)] transition duration-200 hover:bg-[var(--color-control-bg-hover)]"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
              </Tooltip>
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col">{panelInner}</div>
          {footerSlot ? <div className="mt-3 shrink-0">{footerSlot}</div> : null}
        </aside>
      ) : null}

      {!desktopOnly ? (
        <AnimatePresence>
          {mobileSheetOpen ? (
            <>
              <motion.div
                key="preview-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={onMobileSheetClose}
              />
              <motion.aside
                key="preview-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl md:hidden"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</p>
                  <button
                    type="button"
                    onClick={onMobileSheetClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-control-bg)]"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{panelInner}</div>
                {footerSlot ? <div className="mt-3 shrink-0">{footerSlot}</div> : null}
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      ) : null}
    </>
  );
}
