import { writeFile } from 'fs/promises';
import path from 'path';
import { closePdfBrowser, generatePDF, renderTemplate } from '@/lib/pdf';
import { getSampleCVData } from '@/lib/cv-sample-data';
import { ALL_TEMPLATE_IDS } from '@/src/config/templateConfig';
import type { TemplateId } from '@/src/types/cv.types';

const SECTION_MARKERS = [
  'Education',
  'Experience',
  'Skills',
  'Projects',
  'Publications',
];

async function main() {
  const testCVData = getSampleCVData('#2563EB');
  let failed = 0;

  for (const templateId of ALL_TEMPLATE_IDS) {
    const html = renderTemplate(templateId, {
      ...testCVData,
      meta: {
        ...testCVData.meta,
        templateId: templateId as TemplateId,
      },
    });

    if (!html || html.length < 500) {
      console.error(`FAIL: ${templateId} — HTML too short (${html?.length ?? 0} chars)`);
      failed++;
      continue;
    }

    if (!html.includes('Alex Morgan')) {
      console.error(`FAIL: ${templateId} — missing candidate name in HTML`);
      failed++;
      continue;
    }

    const markerHits = SECTION_MARKERS.filter((m) => html.includes(m));
    if (markerHits.length < 2) {
      console.error(
        `FAIL: ${templateId} — expected section markers, found: ${markerHits.join(', ') || 'none'}`
      );
      failed++;
      continue;
    }

    const pdf = await generatePDF(html);
    if (!pdf || pdf.length < 1000) {
      console.error(`FAIL: ${templateId} — PDF too small (${pdf?.length ?? 0} bytes)`);
      failed++;
      continue;
    }

    const outPath = path.join('/tmp', `test-${templateId}.pdf`);
    await writeFile(outPath, pdf);
    const kb = (pdf.length / 1024).toFixed(1);
    console.log(`OK: ${templateId} — ${kb} kb -> ${outPath}`);
  }

  await closePdfBrowser();

  if (failed > 0) {
    console.error(`\n${failed} template(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${ALL_TEMPLATE_IDS.length} templates passed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
