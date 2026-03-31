'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FeatureGate, TemplateGate } from '@/components/shared/FeatureGate';
import { useCVProfile } from '@/hooks/useCV';
import { useJobSpecificCV } from '@/hooks/useJobSpecificCVs';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { cn } from '@/lib/utils';

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

const CV_DOC_WIDTH = 794;
const CV_DOC_HEIGHT = 1123;

function TemplatePreviewThumb({
  templateId,
  accent,
  name,
}: {
  templateId: string;
  accent: string;
  name: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

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
    <div ref={wrapRef} className="relative aspect-[210/297] w-full overflow-hidden bg-slate-100">
      <div
        className="absolute left-0 top-0 origin-top-left"
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

export default function CVTemplatesPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const jobCvId = searchParams.get('job_cv_id');
  const { data: cv } = useCVProfile();
  const { data: jobCv, isLoading: jobCvLoading } = useJobSpecificCV(
    jobCvId ?? ''
  );
  const { tier } = useSubscription();
  const [color, setColor] = useState('#2563EB');
  const [exporting, setExporting] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () =>
      setDraftActive(Boolean(sessionStorage.getItem('cv_draft')));
    compute();
    const onUpdate = () => compute();
    window.addEventListener('cv_draft_updated', onUpdate);
    return () => window.removeEventListener('cv_draft_updated', onUpdate);
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['cv-templates'],
    queryFn: async (): Promise<CVTemplate[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('cv_templates')
        .select('*')
        .eq('type', 'cv')
        .order('sort_order');
      return (data ?? []) as CVTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });

  async function setPreferredTemplate(id: string) {
    if (!cv) {
      toast('Create your CV profile first.', 'error');
      return;
    }
    if (draftActive) {
      toast('Press Save first to persist your core CV.', 'error');
      return;
    }
    const supabase = createClient();
    await supabase
      .from('cv_profiles')
      .update({ preferred_cv_template_id: id })
      .eq('id', cv.id);
    toast('Default template updated.', 'success');
  }

  async function exportPdf(templateId: string) {
    if (jobCvId) {
      if (!jobCv || jobCvLoading) return;
      setExporting(templateId);
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cv',
          job_cv_id: jobCvId,
          template_id: templateId,
          accent_color: color,
        }),
      });
      setExporting(null);
      if (!res.ok) {
        toast('Export failed.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      return;
    }

    if (!cv) return;
    setExporting(templateId);
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cv',
        id: cv.id,
        template_id: templateId,
        accent_color: color,
      }),
    });
    setExporting(null);
    if (!res.ok) {
      toast('Export failed.', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  const hasEditableCv = jobCvId
    ? Boolean(jobCv && !jobCvLoading)
    : Boolean(cv);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">CV templates</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Browse layouts with sample previews. Open a template to edit your CV with a live preview, then export PDF.
      </p>
      <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-[var(--color-muted)]">Gallery accent:</span>
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </FeatureGate>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const allowed = canUseTemplate(
            t.available_tiers as SubscriptionTier[],
            tier
          );
          return (
            <Card key={t.id} padding="none" className="flex flex-col overflow-hidden">
              <TemplatePreviewThumb templateId={t.id} accent={color} name={t.name} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{t.name}</h2>
                    <Badge variant="default" className="mt-1 capitalize">
                      {t.category}
                    </Badge>
                  </div>
                  {t.is_premium ? (
                    <Badge variant="warning">Pro+</Badge>
                  ) : (
                    <Badge variant="success">Free</Badge>
                  )}
                </div>
                <p className="mt-2 flex-1 text-sm text-[var(--color-muted)]">{t.description}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={
                      hasEditableCv
                        ? `/cv/templates/${t.id}/preview${
                            jobCvId
                              ? `?job_cv_id=${encodeURIComponent(jobCvId)}`
                              : ''
                          }`
                        : '#'
                    }
                    aria-disabled={!hasEditableCv}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                      'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-hover)]',
                      !hasEditableCv && 'pointer-events-none opacity-60'
                    )}
                    onClick={(e) => {
                      if (!hasEditableCv) e.preventDefault();
                    }}
                  >
                    Preview &amp; edit
                  </Link>
                  <TemplateGate
                    availableTiers={t.available_tiers as SubscriptionTier[]}
                    userTier={tier}
                  >
                    <div className="flex flex-wrap gap-2">
                      {!jobCvId ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!cv || !allowed || draftActive}
                          onClick={() => void setPreferredTemplate(t.id)}
                        >
                          Use as default
                        </Button>
                      ) : null}
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={exporting === t.id}
                        disabled={!hasEditableCv || !allowed || (!jobCvId && draftActive)}
                        onClick={() => void exportPdf(t.id)}
                      >
                        Export PDF
                      </Button>
                    </div>
                  </TemplateGate>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
