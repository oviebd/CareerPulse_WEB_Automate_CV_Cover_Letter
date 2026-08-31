/**
 * Validates that all TEMPLATE_CONFIGS have correct sectionOrder,
 * and that ALL_TEMPLATE_IDS / VISIBLE_TEMPLATE_IDS are consistent.
 *
 * Run with: npx tsx scripts/validate-templates.ts
 */
import { TEMPLATE_CONFIGS, ALL_TEMPLATE_IDS, VISIBLE_TEMPLATE_IDS, CV_TEMPLATE_SECTION_KEYS_ALL } from '../src/config/templateConfig';
import { getSampleCVData } from '../lib/cv-sample-data';

let failed = 0;

function fail(msg: string) {
  console.error('FAIL:', msg);
  failed++;
}

const VALID_EDUCATION_DETAIL = new Set(['basic', 'academic']);
const VALID_PUBLICATION_STYLE = new Set(['plain', 'numbered', 'apa-ish']);
const VALID_ATS_RISK = new Set(['low', 'medium', 'high']);

// 1. Every TEMPLATE_CONFIGS[id].sectionOrder contains all 15 keys exactly once
for (const [id, cfg] of Object.entries(TEMPLATE_CONFIGS)) {
  const keys = cfg.sectionOrder;
  const allKeys = [...CV_TEMPLATE_SECTION_KEYS_ALL];

  const missing = allKeys.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !allKeys.includes(k));
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);

  if (missing.length) fail(`${id}: sectionOrder missing keys: ${missing.join(', ')}`);
  if (extra.length) fail(`${id}: sectionOrder has unknown keys: ${extra.join(', ')}`);
  if (dupes.length) fail(`${id}: sectionOrder has duplicate keys: ${dupes.join(', ')}`);
  if (keys.length !== allKeys.length) fail(`${id}: sectionOrder length ${keys.length} !== expected ${allKeys.length}`);

  if (!cfg.educationDetail || !VALID_EDUCATION_DETAIL.has(cfg.educationDetail)) {
    fail(`${id}: educationDetail must be 'basic' or 'academic'`);
  }
  if (cfg.publicationStyle && !VALID_PUBLICATION_STYLE.has(cfg.publicationStyle)) {
    fail(`${id}: invalid publicationStyle '${cfg.publicationStyle}'`);
  }
  if (!cfg.atsRisk || !VALID_ATS_RISK.has(cfg.atsRisk)) {
    fail(`${id}: atsRisk must be 'low', 'medium', or 'high'`);
  }
  if (cfg.sidebarSections?.includes('tools')) {
    fail(`${id}: sidebarSections must not include synthetic 'tools' key`);
  }
}

// 2. Every VISIBLE_TEMPLATE_IDS entry exists in ALL_TEMPLATE_IDS
for (const id of VISIBLE_TEMPLATE_IDS) {
  if (!ALL_TEMPLATE_IDS.includes(id)) {
    fail(`VISIBLE_TEMPLATE_IDS contains '${id}' which is not in ALL_TEMPLATE_IDS`);
  }
}

// 3. Every TEMPLATE_CONFIGS key exists in ALL_TEMPLATE_IDS
for (const id of Object.keys(TEMPLATE_CONFIGS)) {
  if (!ALL_TEMPLATE_IDS.includes(id as never)) {
    fail(`TEMPLATE_CONFIGS has '${id}' which is not in ALL_TEMPLATE_IDS`);
  }
}

// 4. Every ALL_TEMPLATE_IDS entry has a config
for (const id of ALL_TEMPLATE_IDS) {
  if (!TEMPLATE_CONFIGS[id]) {
    fail(`ALL_TEMPLATE_IDS contains '${id}' but TEMPLATE_CONFIGS has no entry for it`);
  }
}

// 5. VISIBLE_TEMPLATE_IDS must exactly match ALL_TEMPLATE_IDS (same ids, same order)
if (VISIBLE_TEMPLATE_IDS.length !== ALL_TEMPLATE_IDS.length) {
  fail(
    `VISIBLE_TEMPLATE_IDS has ${VISIBLE_TEMPLATE_IDS.length} entries but ALL_TEMPLATE_IDS has ${ALL_TEMPLATE_IDS.length}; they must match`
  );
}
ALL_TEMPLATE_IDS.forEach((id, i) => {
  if (VISIBLE_TEMPLATE_IDS[i] !== id) {
    fail(`VISIBLE_TEMPLATE_IDS[${i}] is '${VISIBLE_TEMPLATE_IDS[i]}' but ALL_TEMPLATE_IDS[${i}] is '${id}'`);
  }
});

// 6. Full fixture covers all visible templates (structural smoke)
const fixture = getSampleCVData();
for (const id of VISIBLE_TEMPLATE_IDS) {
  if (!TEMPLATE_CONFIGS[id]) {
    fail(`VISIBLE template '${id}' missing from TEMPLATE_CONFIGS`);
  }
  if (!fixture.personal.fullName) {
    fail('Fixture missing fullName');
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log(`All ${Object.keys(TEMPLATE_CONFIGS).length} template configs validated successfully.`);
}
