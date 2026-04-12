import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

/**
 * Whether the selected CV template renders skill levels prominently (bars, dots, etc.).
 * When false, the skills editor hides 1–5 controls; new skills default to rating 3.
 */
export function templateShowsSkillRatingEditor(
  templateId: string | null | undefined
): boolean {
  const id = normalizeTemplateId(templateId ?? 'classic') as TemplateId;
  return TEMPLATE_CONFIGS[id].showsSkillRatingInCv;
}
