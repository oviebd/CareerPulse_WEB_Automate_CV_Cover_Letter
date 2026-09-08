import {
  ALL_TEMPLATE_IDS,
  CL_TEMPLATE_IDS,
  TEMPLATE_CONFIGS,
} from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { CVTemplate } from '@/types';
import type { TemplateId } from '@/src/types/cv.types';
import { getTemplatesRepo } from '@/lib/db/repositories';

/** Pro CV template ids — mirrors db/seed.sql */
const PRO_CV_IDS = new Set([
  'modern',
  'academic',
  'technical',
  'creative',
  'amber-strike',
  'midnight-pro',
  'golden-hour',
  'ocean-slate',
  'violet-edge',
]);

/** Pro cover letter template ids — mirrors db/seed.sql */
const PRO_CL_IDS = new Set(['cl-minimal', 'cl-formal', 'cl-creative']);

const CL_FALLBACK_META: Record<
  string,
  { name: string; description: string; category: string }
> = {
  'cl-classic': {
    name: 'Classic',
    description: 'Traditional letter format',
    category: 'professional',
  },
  'cl-modern': {
    name: 'Modern Block',
    description: 'Clean modern, no indents',
    category: 'minimal',
  },
  'cl-minimal': {
    name: 'Minimal',
    description: 'Ultra-sparse cover letter',
    category: 'minimal',
  },
  'cl-formal': {
    name: 'Formal Letterhead',
    description: 'Company letterhead style',
    category: 'executive',
  },
  'cl-creative': {
    name: 'Creative Header',
    description: 'Bold name header, visual accent',
    category: 'creative',
  },
};

function fallbackCvFromConfig(): CVTemplate[] {
  return ALL_TEMPLATE_IDS.map((id, i) => {
    const cfg = TEMPLATE_CONFIGS[id as TemplateId];
    const isPremium = PRO_CV_IDS.has(id);
    return {
      id,
      type: 'cv',
      name: cfg.label,
      description: cfg.description,
      preview_image_url: null,
      category: cfg.layout === 'two-column' ? 'Modern' : 'Classic',
      is_premium: isPremium,
      available_tiers: isPremium ? ['pro'] : ['free', 'pro'],
      sort_order: i,
    } satisfies CVTemplate;
  });
}

function fallbackCoverLetterFromConfig(): CVTemplate[] {
  return CL_TEMPLATE_IDS.map((id, i) => {
    const meta = CL_FALLBACK_META[id] ?? {
      name: id,
      description: '',
      category: 'professional',
    };
    const isPremium = PRO_CL_IDS.has(id);
    return {
      id,
      type: 'cover_letter',
      name: meta.name,
      description: meta.description,
      preview_image_url: null,
      category: meta.category,
      is_premium: isPremium,
      available_tiers: isPremium ? ['pro'] : ['free', 'pro'],
      sort_order: i,
    } satisfies CVTemplate;
  });
}

async function listLandingTemplates(
  type: 'cv' | 'cover_letter',
  allowedIds: Set<string>,
  fallback: () => CVTemplate[]
): Promise<CVTemplate[]> {
  try {
    const rows = await getTemplatesRepo().listByType(type);
    if (!rows?.length) {
      return fallback();
    }
    const filtered = rows.filter((row) => allowedIds.has(normalizeTemplateId(row.id)));
    return filtered.length ? filtered : fallback();
  } catch {
    return fallback();
  }
}

/** CV rows from `cv_templates` (same source as the app), filtered to known unified template ids. */
export async function getCvTemplatesForLanding(): Promise<CVTemplate[]> {
  const allowed = new Set<string>(ALL_TEMPLATE_IDS as unknown as string[]);
  return listLandingTemplates('cv', allowed, fallbackCvFromConfig);
}

/** Cover letter rows from `cv_templates`, filtered to known CL template ids. */
export async function getCoverLetterTemplatesForLanding(): Promise<CVTemplate[]> {
  const allowed = new Set<string>(CL_TEMPLATE_IDS as unknown as string[]);
  return listLandingTemplates('cover_letter', allowed, fallbackCoverLetterFromConfig);
}
