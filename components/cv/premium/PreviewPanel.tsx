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

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];
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
    <aside className="sticky top-24 h-[calc(100vh-7rem)] w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 xl:w-[420px]">
      <div className="mb-3 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => onTabChange('preview')}
          className={cn('flex-1 rounded-lg px-3 py-1.5 text-sm', activeTab === 'preview' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}
        >
          Live Preview
        </button>
        <button
          type="button"
          onClick={() => onTabChange('design')}
          className={cn('flex-1 rounded-lg px-3 py-1.5 text-sm', activeTab === 'design' ? 'bg-white shadow text-slate-900' : 'text-slate-500')}
        >
          Design Settings
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>A4 preview</span>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded bg-slate-100 px-2 py-1" onClick={() => onZoomChange(Math.max(70, zoom - 10))}>
                -
              </button>
              <span>{zoom}%</span>
              <button type="button" className="rounded bg-slate-100 px-2 py-1" onClick={() => onZoomChange(Math.min(140, zoom + 10))}>
                +
              </button>
            </div>
          </div>
          <div className="relative h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50">
            {previewBusy ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 text-sm">Updating preview...</div> : null}
            {previewPdfUrl ? (
              <iframe
                title="CV live preview"
                src={previewPdfUrl}
                className="h-full w-full origin-top"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">Preview unavailable</div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs">
            <button type="button" className="rounded bg-slate-100 px-2 py-1" onClick={() => onPageChange(Math.max(1, currentPage - 1))}>
              Prev
            </button>
            <span>Page {currentPage}</span>
            <button type="button" className="rounded bg-slate-100 px-2 py-1" onClick={() => onPageChange(currentPage + 1)}>
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Template</p>
            <div className="grid gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onTemplateChange(template.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-sm transition',
                    selectedTemplateId === template.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-slate-500">{template.category}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Accent Color</p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn('h-8 w-8 rounded-full ring-2 ring-offset-2', accent === color ? 'ring-slate-700' : 'ring-transparent')}
                  style={{ backgroundColor: color }}
                  onClick={() => onAccentChange(color)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Font</p>
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => onFontFamilyChange(font)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm',
                    fontFamily === font ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200'
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
