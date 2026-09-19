import { describe, expect, it } from 'vitest';
import { createEmptyCVData } from '@/src/utils/cvDefaults';
import { mergePreservedProfileLinkDrafts } from '@/lib/profile-links';
import { generateId } from '@/lib/utils';

describe('mergePreservedProfileLinkDrafts', () => {
  it('re-attaches local draft rows missing from server CVData', () => {
    const draftId = generateId();
    const local = createEmptyCVData();
    local.personal.links.other = [{ id: draftId, label: '', url: '' }];

    const fromServer = createEmptyCVData();
    fromServer.personal.links.other = [];

    const merged = mergePreservedProfileLinkDrafts(local, fromServer);
    expect(merged.personal.links.other).toEqual([{ id: draftId, label: '', url: '' }]);
  });
});
