import type { CVData } from '@/types';

/** Deep clone for undo/redo stacks (JSON-safe CV payload). */
export function cloneCvData(d: CVData): CVData {
  return JSON.parse(JSON.stringify(d)) as CVData;
}
