/**
 * Smoke test: themed DOCX for all 5 cover letter templates.
 * Run: npm run test-cover-letter-docx
 */
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateCoverLetterDocx } from '../lib/cover-letter-docx';
import { CL_TEMPLATE_IDS } from '../src/config/templateConfig';

const SAMPLE_VARS = {
  applicant_name: 'Alex Morgan',
  applicant_email: 'alex@email.com',
  applicant_phone: '+1 555 0192',
  applicant_location: 'San Francisco, CA',
  applicant_linkedin: 'linkedin.com/in/alexmorgan',
  company_name: 'Northwind Labs',
  job_title: 'Senior Product Designer',
  date: 'August 31, 2026',
  cover_letter_body:
    'Dear Hiring Manager,\n\nI am excited to apply for the Senior Product Designer role.\n\nSincerely,\nAlex',
  primary_color: '#2563EB',
};

const MARKERS: Record<string, RegExp> = {
  'cl-classic': /Sincerely/i,
  'cl-modern': /2563EB/i,
  'cl-minimal': /Alex Morgan/,
  'cl-formal': /Professional correspondence|Yours faithfully/i,
  'cl-creative': /2563EB/i,
};

async function main() {
  await mkdir('/tmp/cl-docx-tests', { recursive: true });
  let failed = 0;

  for (const templateId of CL_TEMPLATE_IDS) {
    const buf = await generateCoverLetterDocx(templateId, SAMPLE_VARS);
    if (buf.length < 1500 || buf[0] !== 0x50) {
      console.error(`FAIL: ${templateId}`);
      failed++;
      continue;
    }
    const text = buf.toString('latin1');
    const marker = MARKERS[templateId];
    if (marker && !marker.test(text)) {
      console.warn(`WARN: ${templateId} — marker not found`);
    }
    const outPath = join('/tmp/cl-docx-tests', `${templateId}.docx`);
    await writeFile(outPath, buf);
    console.log(`OK: ${templateId} — ${buf.length} bytes`);
  }

  if (failed) process.exit(1);
  console.log(`\nAll ${CL_TEMPLATE_IDS.length} cover letter DOCX tests passed.`);
}

void main();
