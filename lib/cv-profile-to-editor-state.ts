import { cvProfileToCvData } from '@/lib/cv-profile-cvdata';
import { DEFAULT_CV_ACCENT } from '@/lib/cv-accent';
import type { CVData, CVProfile } from '@/types';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { LayoutType, TemplateId } from '@/src/types/cv.types';
import type { CVEditorState } from '@/lib/cv-editor-state';

export function applyCvEditorDesign(
  cv: CVData,
  templateId: string,
  accent: string,
  font: string
): CVData {
  const tid = normalizeTemplateId(templateId) as TemplateId;
  const cfg = TEMPLATE_CONFIGS[tid];
  const layout: LayoutType = cfg.layout === 'two-column' ? 'two-column' : 'single-column';
  return {
    ...cv,
    meta: {
      ...cv.meta,
      templateId: tid,
      colorScheme: accent,
      fontFamily: font,
      layout,
      showPhoto: cfg.showPhoto,
      sectionOrder: [...cfg.sectionOrder],
    },
  };
}

export function cvProfileToEditorState(p: CVProfile): CVEditorState {
  const tid = p.preferred_template_id ?? 'classic';
  const accent = p.accent_color ?? DEFAULT_CV_ACCENT;
  const font = p.font_family ?? 'Inter';
  return {
    cvData: applyCvEditorDesign(cvProfileToCvData(p), tid, accent, font),
    name: p.name ?? 'Untitled CV',
    preferred_template_id: tid,
    accent_color: accent,
    font_family: font,
  };
}
