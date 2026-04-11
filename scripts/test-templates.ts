import { writeFile } from 'fs/promises';
import path from 'path';
import { closePdfBrowser, generatePDF, renderTemplate } from '@/lib/pdf';
import { getSampleCVData } from '@/lib/cv-sample-data';

const testCVData = getSampleCVData('#2563EB');

async function main() {
  const ids = [
    'classic',
    'modern',
    'academic',
    'technical',
    'minimal',
    'creative',
    'entry-level',
    'healthcare',
  ];
  for (const templateId of ids) {
    const html = renderTemplate(templateId, {
      ...testCVData,
      meta: { ...testCVData.meta, templateId: templateId as typeof testCVData.meta.templateId },
    });
    const pdf = await generatePDF(html);
    const outPath = path.join('/tmp', `test-${templateId}.pdf`);
    await writeFile(outPath, pdf);
    const kb = (pdf.length / 1024).toFixed(1);
    console.log(templateId, kb, 'kb ->', outPath);
  }
  await closePdfBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
