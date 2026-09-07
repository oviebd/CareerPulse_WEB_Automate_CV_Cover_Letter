import { applyCvSectionVisibility } from '@/lib/cv-section-visibility';
import { getCvsRepo } from '@/lib/db/repositories/cvs';
import { getProfilesRepo } from '@/lib/db/repositories/profiles';
import { getTemplatesRepo } from '@/lib/db/repositories/templates';
import { generateCVDocx } from '@/lib/cv-docx';
import { profileToUniversalCV } from '@/lib/cv-universal-bridge';
import type { CVProfile, SubscriptionTier } from '@/types';
import type { CVData } from '@/types';
import { canAccessFeature } from '@/lib/subscription';
import { resolveEffectiveTier } from '@/lib/dev-subscription';
import { assertTemplateAccess } from '@/lib/templates/access';
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

/**
 * Build CVData for PDF/HTML from a DB row and/or editor snapshot.
 * Editor snapshots use universal CVData (`personal`, `meta`); migrateLegacyCVData
 * handles both that shape and flat CVProfile rows — same path as preview-png.
 */
export function mergedRowAndSnapshotToCVData(
  cvRow: CVProfile | null,
  snapshot: (Partial<CVProfile> & Record<string, unknown>) | null | undefined,
  options: {
    accent_color?: string;
    watermark?: boolean;
    fontFamily?: string;
    templateId: TemplateId;
  }
): CVData {
  const snap =
    snapshot && typeof snapshot === 'object'
      ? (() => {
          const { id: _i, user_id: _u, ...rest } = snapshot;
          return rest as Record<string, unknown>;
        })()
      : {};

  const merged: Record<string, unknown> = {
    ...(cvRow ?? {}),
    ...snap,
    preferred_template_id:
      snap.preferred_template_id ??
      (cvRow as CVProfile | null)?.preferred_template_id ??
      options.templateId,
    accent_color:
      options.accent_color ??
      snap.accent_color ??
      (cvRow as CVProfile | null)?.accent_color,
    font_family:
      options.fontFamily ??
      snap.font_family ??
      (cvRow as CVProfile | null)?.font_family,
  };

  let data = migrateLegacyCVData(merged);
  const visibility =
    (merged.section_visibility as CVData['sectionVisibility']) ??
    data.sectionVisibility;
  data = applyCvSectionVisibility(data, visibility);
  data.meta.templateId = options.templateId;
  data.meta.colorScheme = options.accent_color ?? data.meta.colorScheme;
  if (options.fontFamily?.trim()) {
    data.meta.fontFamily = options.fontFamily.trim();
  }
  data.watermark = options.watermark ?? false;
  return data;
}

export async function exportCV(
  userId: string,
  templateId: string,
  accentColor?: string,
  snapshot?: Partial<CVProfile> | null,
  coreCvId?: string | null,
  fontFamily?: string,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<{ pdf: Buffer; filename: string }> {
  const profile = await getProfilesRepo().getById(userId);
  const tier = resolveEffectiveTier(profile?.subscription_tier ?? 'free');

  const normalizedId = normalizeTemplateId(templateId) as TemplateId;

  const tmpl = await getTemplatesRepo().getById(normalizedId);

  if (!tmpl || tmpl.type !== 'cv') {
    if (!ALL_TEMPLATE_IDS.includes(normalizedId)) {
      throw new Error('TEMPLATE_NOT_FOUND');
    }
  }

  try {
    await assertTemplateAccess(normalizedId, tier);
  } catch {
    throw new Error('TEMPLATE_FORBIDDEN');
  }

  let cvRow: CVProfile | null = null;
  if (coreCvId) {
    const data = await getCvsRepo().getById(userId, coreCvId);
    if (data) cvRow = data as unknown as CVProfile;
  } else {
    const list = await getCvsRepo().listByUser(userId);
    if (list[0]) cvRow = list[0] as unknown as CVProfile;
  }

  if (!cvRow && !(snapshot && typeof snapshot === 'object')) {
    throw new Error('CV_NOT_FOUND');
  }

  const watermark = tier === 'free';
  const cvData = mergedRowAndSnapshotToCVData(cvRow, snapshot, {
    accent_color: accentColor ?? '#6C63FF',
    watermark,
    fontFamily,
    templateId: normalizedId,
  });

  const nameSlug = slugifyName(
    cvData.personal.fullName ?? cvRow?.full_name ?? 'untitled'
  );
  const filename = `cv-${nameSlug}-${normalizedId}.${format === 'docx' ? 'docx' : 'pdf'}`;
  if (format === 'docx') {
    if (!canAccessFeature(tier, 'docxExport')) {
      throw new Error('DOCX_FORBIDDEN');
    }
    const docx = await generateCVDocx(cvData);
    return { pdf: docx, filename };
  }

  const pdf = await generateCVPdf(cvData);
  return { pdf, filename };
}
