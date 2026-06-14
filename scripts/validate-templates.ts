/**
 * Validates that all TEMPLATE_CONFIGS have correct sectionOrder,
 * and that ALL_TEMPLATE_IDS / VISIBLE_TEMPLATE_IDS are consistent.
 *
 * Run with: npx tsx scripts/validate-templates.ts
 */
import { TEMPLATE_CONFIGS, ALL_TEMPLATE_IDS, VISIBLE_TEMPLATE_IDS, CV_TEMPLATE_SECTION_KEYS_ALL } from '../src/config/templateConfig';

let failed = 0;

function fail(msg: string) {
  console.error('FAIL:', msg);
  failed++;
}

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

// 5. No retired premium variants are in VISIBLE_TEMPLATE_IDS
const retiredPremium = ['amber-strike', 'golden-hour', 'ocean-slate', 'violet-edge'];
for (const id of retiredPremium) {
  if (VISIBLE_TEMPLATE_IDS.includes(id as never)) {
    fail(`Retired premium template '${id}' should not be in VISIBLE_TEMPLATE_IDS`);
  }
  if (!ALL_TEMPLATE_IDS.includes(id as never)) {
    fail(`Retired premium template '${id}' must stay in ALL_TEMPLATE_IDS for backward compat`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log(`All ${Object.keys(TEMPLATE_CONFIGS).length} template configs validated successfully.`);
}
