import type { CVData } from '@/types';
import { universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { applyDesignToCv } from '@/lib/cv-apply-design';

export function buildCvProfilePatchPayload(st: {
  cvData: CVData;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
}): Record<string, unknown> {
  const cv = applyDesignToCv(
    st.cvData,
    st.preferred_template_id,
    st.accent_color,
    st.font_family
  );
  return {
    name: st.name.trim() || 'Untitled CV',
    ...universalToProfilePayload(cv),
    font_family: st.font_family,
    accent_color: st.accent_color,
    preferred_template_id: normalizeTemplateId(st.preferred_template_id),
    original_cv_file_url: null,
  };
}
