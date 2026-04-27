import { cvProfileToCvData } from '@/lib/cv-profile-cvdata';
import type { CVProfile } from '@/types';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { LayoutType, TemplateId } from '@/src/types/cv.types';
import type { CVEditorState } from '@/lib/cv-editor-state';

function applyDesign(
  cv: CVEditorState['cvData'],
  templateId: string,
  accent: string,
  font: string
) {
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
  let cvData = cvProfileToCvData(p);
  cvData = applyDesign(
    cvData,
    tid,
    p.accent_color ?? '#6C63FF',
    p.font_family ?? 'Inter'
  );
  return {
    cvData,
    name: p.name ?? 'Untitled CV',
    preferred_template_id: tid,
    accent_color: p.accent_color ?? '#6C63FF',
    font_family: p.font_family ?? 'Inter',
  };
}
