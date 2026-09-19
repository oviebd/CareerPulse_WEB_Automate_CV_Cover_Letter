import { describe, expect, it } from 'vitest';
import { applyPreviewHtmlResponse } from '@/lib/preview-html-client';

describe('applyPreviewHtmlResponse', () => {
  it('skips blob swap when HTML is unchanged', async () => {
    const urlRef = { current: 'blob:existing' as string | null };
    const htmlRef = { current: '<html>same</html>' };
    const result = await applyPreviewHtmlResponse('<html>same</html>', {
      urlRef,
      htmlRef,
    });
    expect(result.applied).toBe(false);
    expect(result.url).toBe('blob:existing');
  });
});
