'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FeatureGate, TemplateGate } from '@/components/shared/FeatureGate';
import { useCVProfile } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

export default function CVTemplatesPage() {
  const { toast } = useToast();
  const { data: cv } = useCVProfile();
  const { tier } = useSubscription();
  const [color, setColor] = useState('#2563EB');
  const [exporting, setExporting] = useState<string | null>(null);

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
    const supabase = createClient();
    await supabase
      .from('cv_profiles')
      .update({ preferred_cv_template_id: id })
      .eq('id', cv.id);
    toast('Default template updated.', 'success');
  }

  async function exportPdf(templateId: string) {
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-2xl font-bold">CV templates</h1>
      <p className="text-sm text-[var(--color-muted)]">
        Preview layouts and export PDF. Free exports include a small watermark.
      </p>
      <FeatureGate requiredTier={['pro', 'premium', 'career']} userTier={tier}>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-[var(--color-muted)]">Accent:</span>
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
            <Card key={t.id}>
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
              <p className="mt-2 text-sm text-[var(--color-muted)]">{t.description}</p>
              <TemplateGate
                availableTiers={t.available_tiers as SubscriptionTier[]}
                userTier={tier}
              >
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!cv || !allowed}
                    onClick={() => void setPreferredTemplate(t.id)}
                  >
                    Use template
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={exporting === t.id}
                    disabled={!cv || !allowed}
                    onClick={() => void exportPdf(t.id)}
                  >
                    Export PDF
                  </Button>
                </div>
              </TemplateGate>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
