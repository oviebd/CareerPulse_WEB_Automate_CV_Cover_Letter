/**
 * Smoke test: themed DOCX for all 18 CV templates.
 * Run: npm run test-cv-docx
 */
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateCVDocx } from '../lib/cv-docx/index';
import { getSampleCVData } from '../lib/cv-sample-data';
import { ALL_TEMPLATE_IDS } from '../src/config/templateConfig';
import type { TemplateId } from '../src/types/cv.types';

const MARKERS: Partial<Record<TemplateId, RegExp>> = {
  modern: /w:tbl/,
  'midnight-pro': /1B2137/i,
  europass: /Personal information|003399/i,
  executive: /Competencies|Georgia/i,
  'violet-edge': /●|○/,
  'amber-strike': /F5C518/i,
};

async function main() {
  await mkdir('/tmp/cv-docx-tests', { recursive: true });
  let failed = 0;

  for (const templateId of ALL_TEMPLATE_IDS) {
    const base = getSampleCVData('#2563EB');
    const data = {
      ...base,
      meta: {
        ...base.meta,
        templateId,
        showPhoto: true,
      },
      personal: {
        ...base.personal,
        photo: undefined,
      },
    };
    const buf = await generateCVDocx(data);

    if (buf.length < 2000) {
      console.error(`FAIL: ${templateId} — DOCX too small (${buf.length} bytes)`);
      failed++;
      continue;
    }
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
      console.error(`FAIL: ${templateId} — not a zip archive`);
      failed++;
      continue;
    }
    const text = buf.toString('latin1');
    if (!text.includes('[Content_Types].xml') || !text.includes('word/document.xml')) {
      console.error(`FAIL: ${templateId} — missing OOXML parts`);
      failed++;
      continue;
    }

    const marker = MARKERS[templateId];
    if (marker && !marker.test(text)) {
      console.warn(`WARN: ${templateId} — optional marker not found (layout may still be ok)`);
    }

    const outPath = join('/tmp/cv-docx-tests', `cv-${templateId}.docx`);
    await writeFile(outPath, buf);
    console.log(`OK: ${templateId} — ${buf.length} bytes → ${outPath}`);
  }

  if (failed) {
    console.error(`\n${failed} template(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${ALL_TEMPLATE_IDS.length} CV DOCX smoke tests passed.`);
}

void main();
