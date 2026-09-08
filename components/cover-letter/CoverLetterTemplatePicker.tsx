'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import {
  DOCUMENT_PREVIEW_WIDTH,
  DOCUMENT_PREVIEW_A4_HEIGHT,
} from '@/components/shared/DocumentPrintPreviewFrame';

/** Cover letter templates use body width 210mm — force 794px for iframe previews. */
function injectCoverLetterPreviewOverrides(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc?.head) return;
    if (doc.getElementById('__cl-preview-overrides')) return;
    const style = doc.createElement('style');
    style.id = '__cl-preview-overrides';
    style.textContent = [
      'html{height:auto!important;overflow:hidden!important;',
      'margin:0!important;padding:0!important;',
      'color-scheme:light!important;background:#fff!important;}',
      'body{box-sizing:border-box!important;width:794px!important;',
      'min-height:0!important;height:auto!important;overflow:visible!important;',
      'background:#fff!important;color:#0f172a!important;}',
    ].join('');
    doc.head.appendChild(style);
  } catch {
    // ignore
  }
}

function CoverLetterSampleThumb({
  templateId,
  accent,
  name,
  className,
}: {
  templateId: string;
  accent: string;
  name: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / DOCUMENT_PREVIEW_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = `/api/cover-letter/preview-html?template_id=${encodeURIComponent(
    templateId
  )}&sample=1&accent=${encodeURIComponent(accent)}`;

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative aspect-[210/297] w-full overflow-hidden bg-[var(--color-document-paper-well)] p-2',
        className
      )}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-sm bg-[var(--color-document-paper)]"
        style={{ boxShadow: 'var(--shadow-document-paper)' }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: DOCUMENT_PREVIEW_WIDTH,
            height: DOCUMENT_PREVIEW_A4_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            src={src}
            className="block h-full w-full border-0 bg-[var(--color-document-paper)]"
            width={DOCUMENT_PREVIEW_WIDTH}
            height={DOCUMENT_PREVIEW_A4_HEIGHT}
            title={`${name} preview`}
            loading="lazy"
            onLoad={(e) => {
              injectCoverLetterPreviewOverrides(e.currentTarget);
            }}
          />
        </div>
      </div>
      <div className="absolute inset-0 z-10" />
    </div>
  );
}

type Props = {
  templates: CVTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  accent?: string;
  userTier: SubscriptionTier;
  className?: string;
  columns?: 'compact' | 'default';
};

/**
 * Visual cover-letter template picker with live sample HTML previews (A4 aspect).
 */
export function CoverLetterTemplatePicker({
  templates,
  selectedId,
  onSelect,
  accent = '#2563EB',
  userTier,
  className,
  columns = 'default',
}: Props) {
  if (templates.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted)]">Loading templates…</p>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3',
        columns === 'compact'
          ? 'grid-cols-2 sm:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-3',
        className
      )}
    >
      {templates.map((t) => {
        const allowed = canUseTemplate(
          t.available_tiers as SubscriptionTier[],
          userTier
        );
        const selected = selectedId === t.id;

        return (
          <button
            key={t.id}
            type="button"
            disabled={!allowed}
            aria-pressed={selected}
            aria-label={`${t.name} layout${selected ? ', in use' : ''}`}
            onClick={() => {
              if (allowed) onSelect(t.id);
            }}
            className={cn(
              'group relative aspect-[210/297] overflow-hidden rounded-xl border-2 transition-all duration-300',
              !allowed && 'cursor-not-allowed opacity-60',
              selected
                ? 'border-[var(--color-primary-400)] shadow-lg shadow-[var(--color-primary-400)]/20'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
            )}
          >
            <CoverLetterSampleThumb
              templateId={t.id}
              accent={accent}
              name={t.name}
              className="absolute inset-0 h-full w-full grayscale-[0.1] opacity-90 transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0 group-hover:opacity-100"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/10 to-transparent p-3 transition-opacity duration-300 group-hover:from-black/90">
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-widest transition-colors',
                  selected
                    ? 'text-[var(--color-primary-400)]'
                    : 'text-white'
                )}
              >
                {t.name}
              </p>
              {t.category ? (
                <p className="line-clamp-1 text-[8px] capitalize text-white/80">
                  {t.category}
                </p>
              ) : null}
            </div>
            {!allowed ? (
              <span className="absolute left-2 top-2 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-white">
                Upgrade
              </span>
            ) : null}
            {selected ? (
              <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-[var(--color-primary-400)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                In use
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** A4 sample thumbnail for the templates gallery (non-selectable display). */
export function CoverLetterTemplateThumb({
  templateId,
  accent,
  name,
  className,
}: {
  templateId: string;
  accent: string;
  name: string;
  className?: string;
}) {
  return (
    <CoverLetterSampleThumb
      templateId={templateId}
      accent={accent}
      name={name}
      className={className}
    />
  );
}
