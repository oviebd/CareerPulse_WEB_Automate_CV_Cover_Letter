'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutTemplate, Mail } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CoverLetterPrintPreviewFrame } from '@/components/cover-letter/CoverLetterPrintPreviewFrame';
import { TemplateGate } from '@/components/shared/FeatureGate';
import { useCVProfile } from '@/hooks/useCV';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/components/ui/toast';
import type { CVTemplate, SubscriptionTier } from '@/types';
import { canUseTemplate } from '@/lib/subscription';

const SWATCHES = ['#2563EB', '#0d9488', '#7c3aed', '#dc2626', '#0f172a'];

export default function CoverLetterTemplatesPage() {
  const { toast } = useToast();
  const { data: cv } = useCVProfile();
  const { tier } = useSubscription();
  const [color, setColor] = useState('#2563EB');

  const { data: templates = [] } = useQuery({
    queryKey: ['cover-letter-templates'],
    queryFn: async (): Promise<CVTemplate[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from('cv_templates')
        .select('*')
        .eq('type', 'cover_letter')
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
      .update({ preferred_cl_template_id: id })
      .eq('id', cv.id);
    toast('Default cover letter template updated.', 'success');
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Cover letter templates</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Browse layouts with sample previews. Your chosen default is used when you export a cover letter to PDF.
          </p>
        </div>
        <Link
          href="/cover-letters"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          <Mail className="h-4 w-4" />
          Back to cover letters
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-[var(--color-muted)]" aria-hidden />
        <span className="text-sm text-[var(--color-muted)]">Accent color:</span>
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className="h-8 w-8 rounded-full border-2 border-white shadow ring-2 ring-transparent ring-offset-2"
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Preview accent ${c}`}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const allowed = canUseTemplate(
            t.available_tiers as SubscriptionTier[],
            tier
          );
          return (
            <Card key={t.id} padding="none" className="flex flex-col overflow-hidden">
              <CoverLetterPrintPreviewFrame
                src={`/api/cover-letter/preview-html?template_id=${encodeURIComponent(t.id)}&sample=1&accent=${encodeURIComponent(color)}`}
                title={`${t.name} sample preview`}
                containerHeight={300}
              />
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
                <div className="mt-4">
                  <TemplateGate
                    availableTiers={t.available_tiers as SubscriptionTier[]}
                    userTier={tier}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!cv || !allowed}
                      onClick={() => void setPreferredTemplate(t.id)}
                    >
                      Use as default
                    </Button>
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
