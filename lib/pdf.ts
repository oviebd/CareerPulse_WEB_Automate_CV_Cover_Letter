import { createAdminClient } from '@/lib/supabase/server';
import { applyCvSectionVisibility } from '@/lib/cv-section-visibility';
import { profileToUniversalCV } from '@/lib/cv-universal-bridge';
import type { CVProfile, SubscriptionTier } from '@/types';
import type { CVData } from '@/types';
import { canUseTemplate } from '@/lib/subscription';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { ALL_TEMPLATE_IDS } from '@/src/config/templateConfig';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';
import {
  closePdfBrowser,
  generateCVPdf,
  generateCVPreview,
  generatePDFFromHtml,
  getBrowser,
  renderUnifiedHtml,
} from '@/src/services/pdfRenderer';

export {
  getBrowser,
  closePdfBrowser,
  generateCVPdf,
  generateCVPreview,
  renderUnifiedHtml,
};

export async function generatePDF(html: string): Promise<Buffer> {
  return generatePDFFromHtml(html, { pageSize: 'A4', printBg: true });
}

export function injectTemplateData(
  templateHtml: string,
  data: Record<string, string>
): string {
  let result = templateHtml;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

export function renderTemplate(templateId: string, cvData: CVData): string {
  const tid = normalizeTemplateId(templateId);
  return renderUnifiedHtml({
    ...cvData,
    meta: { ...cvData.meta, templateId: tid },
  });
}

export function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cv'
  );
}

/** Merge a partial profile (e.g. editor draft) into CVData for HTML/PDF rendering. */
export function looseProfileToCVData(
  row: Partial<CVProfile> & Record<string, unknown>,
  options: { accent_color?: string; watermark?: boolean }
): CVData {
  const data = migrateLegacyCVData(row);
  if (options.accent_color) data.meta.colorScheme = options.accent_color;
  if (typeof row.font_family === 'string' && row.font_family.trim()) {
    data.meta.fontFamily = row.font_family.trim();
  }
  data.watermark = options.watermark ?? false;
  return data;
}

export function cvProfileToCVData(
  row: CVProfile,
  options: { accent_color?: string; watermark?: boolean }
): CVData {
  let data = profileToUniversalCV(row);
  data = applyCvSectionVisibility(data, row.section_visibility);
  data.meta.colorScheme = options.accent_color ?? data.meta.colorScheme;
  data.meta.fontFamily = row.font_family ?? data.meta.fontFamily;
  data.watermark = options.watermark ?? false;
  return data;
}

export async function exportCV(
  userId: string,
  templateId: string,
  accentColor?: string,
  snapshot?: Partial<CVProfile> | null,
  coreCvId?: string | null,
  fontFamily?: string
): Promise<{ pdf: Buffer; filename: string }> {
  const supabase = createAdminClient();
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single();
  if (pErr || !profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }
  const tier = resolveEffectiveTier(profile.subscription_tier);

  const normalizedId = normalizeTemplateId(templateId) as TemplateId;

  const { data: tmpl, error: tErr } = await supabase
    .from('cv_templates')
    .select('id, type, available_tiers')
    .eq('id', normalizedId)
    .eq('type', 'cv')
    .maybeSingle();

  /** Tier gates from DB when present; unified `src/templates/{id}` works without a row (partial migrations). */
  let tiers: SubscriptionTier[];
  if (tErr || !tmpl) {
    if (!ALL_TEMPLATE_IDS.includes(normalizedId)) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
    tiers = ['free', 'pro', 'premium', 'career'];
  } else {
    tiers = tmpl.available_tiers as SubscriptionTier[];
  }
  if (!canUseTemplate(tiers, tier)) {
    throw new Error('TEMPLATE_FORBIDDEN');
  }

  let cvRow: CVProfile | null = null;
  if (coreCvId) {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .eq('id', coreCvId)
      .maybeSingle();
    if (!error && data) cvRow = data as CVProfile;
  } else {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) cvRow = data as CVProfile;
  }

  if (!cvRow && !(snapshot && typeof snapshot === 'object')) {
    throw new Error('CV_NOT_FOUND');
  }

  let cv = (cvRow ?? {}) as CVProfile;
  if (snapshot && typeof snapshot === 'object') {
    const { id: _i, user_id: _u, ...rest } = snapshot;
    cv = { ...cv, ...rest } as CVProfile;
  }

  const watermark = tier === 'free';
  const cvData = cvProfileToCVData(cv, {
    accent_color: accentColor ?? '#6C63FF',
    watermark,
  });
  if (fontFamily) cvData.meta.fontFamily = fontFamily;
  cvData.meta.templateId = normalizedId;

  const pdf = await generateCVPdf(cvData);
  const nameSlug = slugifyName(cvData.personal.fullName ?? cv.full_name ?? 'untitled');
  const filename = `cv-${nameSlug}-${normalizedId}.pdf`;
  return { pdf, filename };
}
