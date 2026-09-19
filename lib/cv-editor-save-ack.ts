import type { CVProfile } from '@/types';
import type { CVEditorState } from '@/lib/cv-editor-state';
import { cvProfileToEditorState } from '@/lib/cv-profile-to-editor-state';
import { mergePreservedProfileLinkDrafts } from '@/lib/profile-links';

export type PostSaveAck =
  | { kind: 'snapshot_only'; savedSnapshot: string }
  | { kind: 'rehydrate'; savedSnapshot: string; editorState: CVEditorState };

/** After PATCH, avoid replacing in-memory editor when the client still matches the save snapshot. */
export function resolvePostSaveAck(
  currentSnap: string,
  snapshotSaved: string,
  updated: CVProfile,
  currentEditorState: CVEditorState
): PostSaveAck {
  if (currentSnap === snapshotSaved) {
    return { kind: 'snapshot_only', savedSnapshot: snapshotSaved };
  }
  const st = cvProfileToEditorState(updated);
  const cvData = mergePreservedProfileLinkDrafts(currentEditorState.cvData, st.cvData);
  const editorState: CVEditorState = { ...st, cvData };
  return {
    kind: 'rehydrate',
    savedSnapshot: snapshotSaved,
    editorState,
  };
}
