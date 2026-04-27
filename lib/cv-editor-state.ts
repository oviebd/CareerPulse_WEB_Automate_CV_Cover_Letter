import type { CVData } from '@/types';
import { createEmptyCVData } from '@/src/utils/cvDefaults';

/**
 * In-memory editor bundle for the core CV screen (useCVEditor / guest hydration).
 * Kept in a small module to avoid import cycles with hooks/stores.
 */
export interface CVEditorState {
  cvData: CVData;
  name: string;
  preferred_template_id: string;
  accent_color: string;
  font_family: string;
}

export const DEFAULT_EDITOR_STATE: CVEditorState = {
  cvData: createEmptyCVData('classic'),
  name: 'Untitled CV',
  preferred_template_id: 'classic',
  accent_color: '#6C63FF',
  font_family: 'Inter',
};
