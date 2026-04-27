'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { CVTemplate } from '@/types';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';
import { cn } from '@/lib/utils';

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

function LandingTemplateIframe({
  templateId,
  accent,
  name,
}: {
  templateId: string;
  accent: string;
  name: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / CV_DOC_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const src = `/api/cv/preview-html?template_id=${encodeURIComponent(templateId)}&sample=1&accent=${encodeURIComponent(accent)}`;

  return (
    <div ref={wrapRef} className="relative aspect-[210/297] w-full overflow-hidden bg-slate-100 dark:bg-slate-900/50">
      <div
        className="absolute left-0 top-0 origin-top-left will-change-transform"
        style={{ width: CV_DOC_WIDTH, height: CV_DOC_HEIGHT, transform: `scale(${scale})` }}
      >
        <iframe
          src={src}
          className="pointer-events-none block max-w-none border-0"
          width={CV_DOC_WIDTH}
          height={CV_DOC_HEIGHT}
          title={`${name} sample preview`}
          loading="lazy"
        />
      </div>
    </div>
  );
}

export function LandingTemplateGrid({ templates }: { templates: CVTemplate[] }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => {
        const tid = normalizeTemplateId(t.id) as TemplateId;
        const cfg = TEMPLATE_CONFIGS[tid];
        const accent = accentForId(t.id);
        const label = t.name || cfg?.label || t.id;
        const blurb = t.description ?? cfg?.description ?? '';
        const category = t.category || (cfg?.layout === 'two-column' ? 'Modern' : 'Classic');
        return (
          <div
            key={t.id}
            className={cn(
              'group flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)]',
              'bg-[var(--color-surface)]/60 transition hover:border-[var(--color-primary-200)] hover:shadow-lg'
            )}
          >
            <div className="relative w-full overflow-hidden border-b border-[var(--color-border)] bg-white dark:bg-slate-950/40">
              {t.preview_image_url ? (
                <div className="relative aspect-[4/3] w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.preview_image_url}
                    alt=""
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              ) : (
                <LandingTemplateIframe templateId={t.id} accent={accent} name={label} />
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-[var(--color-text-primary)]">{label}</h3>
                <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--color-muted)]">
                  {category}
                </span>
              </div>
              {blurb ? (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{blurb}</p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/cv/templates/${encodeURIComponent(t.id)}/preview`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-btn border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-hover-surface)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Full preview
                </Link>
                <Link
                  href={`/cv/builder?template=${encodeURIComponent(t.id)}&guest=true`}
                  className="inline-flex flex-1 items-center justify-center rounded-btn bg-[var(--color-primary-500)] py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  Use template
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
