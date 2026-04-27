import { universalToProfilePayload } from '@/lib/cv-universal-bridge';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import type { LayoutType, TemplateId } from '@/src/types/cv.types';
import type { CVData, CVProfile } from '@/types';
import type { CVEditorState } from '@/lib/cv-editor-state';

function applyDesignToCv(
  cv: CVEditorState['cvData'],
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

function buildPatchBody(st: CVEditorState): Record<string, unknown> {
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

/** Create a core CV row and apply full editor content (login after guest). */
export async function createCoreCvFromEditorState(st: CVEditorState): Promise<CVProfile> {
  const name =
    st.name.trim() || st.cvData.personal.fullName?.trim() || 'Untitled CV';
  const createRes = await fetch('/api/cvs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!createRes.ok) {
    const j = (await createRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? 'Could not create CV');
  }
  const created = (await createRes.json()) as CVProfile;
  const newId = created.id;
  const patch = buildPatchBody(st);
  const patchRes = await fetch(`/api/cvs/${newId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!patchRes.ok) {
    const j = (await patchRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? 'Could not save CV content');
  }
  return (await patchRes.json()) as CVProfile;
}
