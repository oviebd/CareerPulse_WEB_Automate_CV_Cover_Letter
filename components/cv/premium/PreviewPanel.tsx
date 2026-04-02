'use client';

import { cn } from '@/lib/utils';
import type { CVTemplate } from '@/types';

interface PreviewPanelProps {
  previewPdfUrl: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
}


export function PreviewPanel(props: PreviewPanelProps) {
  const {
    previewPdfUrl,
    previewBusy,
    zoom,
    onZoomChange,
    currentPage,
    onPageChange,
  } = props;

  return (
    <aside
      className={cn(
        'glass-panel sticky top-24 h-[calc(100vh-7rem)] w-full rounded-card border border-[var(--color-border)] p-4 shadow-sm xl:w-[630px]'
      )}
    >
      <div className="flex flex-col h-full">
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

        <div className="flex-1 space-y-3 flex flex-col min-h-0 overflow-auto pr-1">
          <div
            className="relative rounded-xl border border-[var(--color-border)] bg-slate-50/50 shadow-inner overflow-hidden"
            style={{
              width: '100%',
              aspectRatio: '210 / 297',
            }}
          >
            {previewBusy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-[var(--color-muted)] backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                   <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary-400)] border-t-transparent" />
                   <span>Updating preview…</span>
                </div>
              </div>
            ) : null}
            {previewPdfUrl ? (
              <div className="flex justify-center h-full w-full">
                <iframe
                  title="CV live preview"
                  src={previewPdfUrl}
                  className="origin-top shadow-lg"
                  style={{
                    width: 794,
                    height: 1123,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                Preview unavailable
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 border-t border-[var(--color-border)] pt-3 font-mono text-xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-3 py-1.5 transition hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              Previous
            </button>
            <span className="font-medium text-[var(--color-text-primary)]">Page {currentPage}</span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-3 py-1.5 transition hover:bg-white/[0.1]"
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
