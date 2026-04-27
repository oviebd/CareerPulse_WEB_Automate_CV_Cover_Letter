import { createClient } from '@/lib/supabase/server';
import { ALL_TEMPLATE_IDS, TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { CVTemplate } from '@/types';
import type { TemplateId } from '@/src/types/cv.types';

function fallbackFromConfig(): CVTemplate[] {
  return ALL_TEMPLATE_IDS.map((id, i) => {
    const cfg = TEMPLATE_CONFIGS[id as TemplateId];
    return {
      id,
      type: 'cv',
      name: cfg.label,
      description: cfg.description,
      preview_image_url: null,
      category: cfg.layout === 'two-column' ? 'Modern' : 'Classic',
      is_premium: false,
      available_tiers: ['free', 'pro', 'premium', 'career'],
      sort_order: i,
    } satisfies CVTemplate;
  });
}

/** CV rows from `cv_templates` (same source as the app), filtered to known unified template ids. */
export async function getCvTemplatesForLanding(): Promise<CVTemplate[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('cv_templates')
      .select('*')
      .eq('type', 'cv')
      .order('sort_order');
    if (error || !data?.length) {
      return fallbackFromConfig();
    }
    const allowed = new Set<string>(ALL_TEMPLATE_IDS as unknown as string[]);
    const filtered = (data as CVTemplate[]).filter((row) =>
      allowed.has(normalizeTemplateId(row.id))
    );
    return filtered.length ? filtered : fallbackFromConfig();
  } catch {
    return fallbackFromConfig();
  }
}
