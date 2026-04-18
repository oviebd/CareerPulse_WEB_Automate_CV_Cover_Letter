import type { CVData } from '@/types';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

export function applyDesignToCv(
  cv: CVData,
  templateId: string,
  accent: string,
  font: string
): CVData {
  const tid = normalizeTemplateId(templateId) as TemplateId;
  const cfg = TEMPLATE_CONFIGS[tid];
  return {
    ...cv,
    meta: {
      ...cv.meta,
      templateId: tid,
      colorScheme: accent,
      fontFamily: font,
      layout: cfg.layout === 'two-column' ? 'two-column' : 'single-column',
      showPhoto: cfg.showPhoto,
      sectionOrder: [...cfg.sectionOrder],
    },
  };
}
