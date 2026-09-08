'use client';

import { useEffect, useRef, useState } from 'react';
import type { CVTemplate } from '@/types';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_PREVIEW_A4_HEIGHT,
  DOCUMENT_PREVIEW_WIDTH,
} from '@/components/shared/DocumentPrintPreviewFrame';

const CV_DOC_WIDTH = 794;
const CV_DOC_HEIGHT = 1123;

const ACCENTS = ['#2563EB', '#0d9488', '#7c3aed', '#6C63FF', '#0f172a', '#dc2626'];

function accentForId(id: string) {
  const tid = normalizeTemplateId(id) as TemplateId;
  const a = TEMPLATE_CONFIGS[tid]?.templateAccent;
  if (a) return a;
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % ACCENTS.length;
  return ACCENTS[h] ?? '#2563EB';
}

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
    // ignore cross-origin
  }
}

function TemplatePreviewIframe({
  templateId,
  accent,
  name,
  kind,
}: {
  templateId: string;
  accent: string;
  name: string;
  kind: 'cv' | 'cover_letter';
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const docWidth = kind === 'cv' ? CV_DOC_WIDTH : DOCUMENT_PREVIEW_WIDTH;
  const docHeight = kind === 'cv' ? CV_DOC_HEIGHT : DOCUMENT_PREVIEW_A4_HEIGHT;
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / docWidth);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [docWidth]);

  const apiPath =
    kind === 'cv'
      ? `/api/cv/preview-html?template_id=${encodeURIComponent(templateId)}&sample=1&accent=${encodeURIComponent(accent)}`
      : `/api/cover-letter/preview-html?template_id=${encodeURIComponent(templateId)}&sample=1&accent=${encodeURIComponent(accent)}`;

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[210/297] w-full overflow-hidden bg-[var(--color-document-paper-well)] p-2"
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-sm bg-[var(--color-document-paper)]"
        style={{ boxShadow: 'var(--shadow-document-paper)' }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            width: docWidth,
            height: docHeight,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            src={apiPath}
            className="pointer-events-none block max-w-none border-0 bg-[var(--color-document-paper)]"
            width={docWidth}
            height={docHeight}
            title={`${name} sample preview`}
            loading="lazy"
            onLoad={
              kind === 'cover_letter'
                ? (e) => injectCoverLetterPreviewOverrides(e.currentTarget)
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

function ProRibbon() {
  return (
    <div className="absolute right-0 top-0 z-10">
      <Badge variant="warning" className="rounded-none rounded-bl-lg rounded-tr-xl px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        Pro
      </Badge>
    </div>
  );
}

type Props = {
  templates: CVTemplate[];
  kind?: 'cv' | 'cover_letter';
  /** Denser grid for CV (18); slightly larger cells for cover letters (5). */
  columns?: 'default' | 'cover_letter';
};

export function LandingTemplateGrid({ templates, kind = 'cv', columns = 'default' }: Props) {
  const gridClass =
    columns === 'cover_letter'
      ? 'mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6';

  return (
    <div className={gridClass}>
      {templates.map((t) => {
        const tid = normalizeTemplateId(t.id) as TemplateId;
        const cfg = kind === 'cv' ? TEMPLATE_CONFIGS[tid] : undefined;
        const accent = accentForId(t.id);
        const label = t.name || cfg?.label || t.id;
        const isPro =
          t.is_premium ||
          (t.available_tiers?.length === 1 && t.available_tiers[0] === 'pro');

        return (
          <article
            key={t.id}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)]',
              'bg-[var(--color-surface)]/60 transition hover:border-[var(--color-primary-200)] hover:shadow-md'
            )}
          >
            <div className="relative overflow-hidden border-b border-[var(--color-border)]">
              {isPro ? <ProRibbon /> : null}
              {t.preview_image_url ? (
                <div className="relative aspect-[210/297] w-full bg-[var(--color-document-paper-well)] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.preview_image_url}
                    alt=""
                    className="h-full w-full rounded-sm object-cover object-top"
                    style={{ boxShadow: 'var(--shadow-document-paper)' }}
                    loading="lazy"
                  />
                </div>
              ) : (
                <TemplatePreviewIframe
                  templateId={t.id}
                  accent={accent}
                  name={label}
                  kind={kind}
                />
              )}
            </div>
            <div className="px-2 py-2">
              <h3 className="truncate text-center text-xs font-medium text-[var(--color-text-primary)]">
                {label}
              </h3>
            </div>
          </article>
        );
      })}
    </div>
  );
}
