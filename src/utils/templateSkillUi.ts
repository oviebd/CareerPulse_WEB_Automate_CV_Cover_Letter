import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

/**
 * Whether the selected CV template can render skill levels (bars, dots, inline labels).
 * When false, the skills editor hides 1–5 controls; new skills default to rating 3.
 */
export function templateCanShowSkillRatings(
  templateId: string | null | undefined
): boolean {
  const id = normalizeTemplateId(templateId ?? 'classic') as TemplateId;
  const cfg = TEMPLATE_CONFIGS[id];
  return cfg.showSkillBars || cfg.showsSkillRatingInCv;
}

/** @deprecated Use templateCanShowSkillRatings */
export function templateShowsSkillRatingEditor(
  templateId: string | null | undefined
): boolean {
  return templateCanShowSkillRatings(templateId);
}
