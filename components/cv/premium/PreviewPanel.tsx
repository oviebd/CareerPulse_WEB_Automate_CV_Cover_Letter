'use client';

import { cn } from '@/lib/utils';
import type { CVTemplate } from '@/types';

interface PreviewPanelProps {
  activeTab: 'preview' | 'design';
  onTabChange: (tab: 'preview' | 'design') => void;
  previewPdfUrl: string;
  previewBusy: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedTemplateId: string;
  templates: CVTemplate[];
  onTemplateChange: (id: string) => void;
  accent: string;
  onAccentChange: (color: string) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

const SWATCHES = ['#6C63FF', '#00D4A8', '#2563EB', '#7c3aed', '#dc2626', '#0f172a'];
const FONTS = ['Inter', 'Manrope', 'DM Sans', 'Lora'];

export function PreviewPanel(props: PreviewPanelProps) {
  const {
    activeTab,
    onTabChange,
    previewPdfUrl,
    previewBusy,
    zoom,
    onZoomChange,
    currentPage,
    onPageChange,
    selectedTemplateId,
    templates,
    onTemplateChange,
    accent,
    onAccentChange,
    fontFamily,
    onFontFamilyChange,
  } = props;

  return (
    <aside
      className={cn(
        'glass-panel sticky top-24 h-[calc(100vh-7rem)] w-full rounded-card border border-[var(--color-border)] p-4 shadow-sm xl:w-[420px]'
      )}
    >
      <div className="mb-3 flex gap-2 rounded-xl bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() => onTabChange('preview')}
          className={cn(
            'flex-1 rounded-btn px-3 py-1.5 text-sm transition',
            activeTab === 'preview'
              ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-md'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
          )}
        >
          Live Preview
        </button>
        <button
          type="button"
          onClick={() => onTabChange('design')}
          className={cn(
            'flex-1 rounded-btn px-3 py-1.5 text-sm transition',
            activeTab === 'design'
              ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-md'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
          )}
        >
          Design Settings
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
            <span>A4 preview</span>
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1 transition hover:bg-white/[0.1]"
                onClick={() => onZoomChange(Math.max(70, zoom - 10))}
              >
                -
              </button>
              <span>{zoom}%</span>
              <button
                type="button"
                className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1 transition hover:bg-white/[0.1]"
                onClick={() => onZoomChange(Math.min(140, zoom + 10))}
              >
                +
              </button>
            </div>
          </div>
          <div className="relative h-[70vh] overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0a0a0f]">
            {previewBusy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-background)]/80 text-sm text-[var(--color-muted)] backdrop-blur-sm">
                Updating preview…
              </div>
            ) : null}
            {previewPdfUrl ? (
              <iframe
                title="CV live preview"
                src={previewPdfUrl}
                className="h-full w-full origin-top"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
                Preview unavailable
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 font-mono text-xs">
            <button
              type="button"
              className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            >
              Prev
            </button>
            <span>Page {currentPage}</span>
            <button
              type="button"
              className="rounded-btn border border-[var(--color-border)] bg-white/[0.06] px-2 py-1"
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Template
            </p>
            <div className="grid gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateChange(template.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-sm transition',
                    selectedTemplateId === template.id
                      ? 'border-[var(--color-primary-400)]/50 bg-[var(--color-primary-100)]/40 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  <p className="font-medium text-[var(--color-text-primary)]">{template.name}</p>
                  <p className="text-xs text-[var(--color-muted)]">{template.category}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Accent color
            </p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-[var(--color-background)] transition',
                    accent === color ? 'ring-[var(--color-primary-400)]' : 'ring-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onAccentChange(color)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Font</p>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => onFontFamilyChange(font)}
                  className={cn(
                    'rounded-btn border px-3 py-2 text-sm transition',
                    fontFamily === font
                      ? 'border-[var(--color-primary-400)]/50 bg-[var(--color-primary-100)]/40 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
