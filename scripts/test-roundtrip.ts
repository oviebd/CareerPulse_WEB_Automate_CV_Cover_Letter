/**
 * Round-trip test: CVData → universalToProfilePayload → migrateLegacyCVData → CVData
 * Run with: npx tsx scripts/test-roundtrip.ts
 */
import { getSampleCVData } from '@/lib/cv-sample-data';
import {
  universalToProfilePayload,
  profileToUniversalCV,
} from '@/lib/cv-universal-bridge';
import { migrateLegacyCVData } from '@/src/utils/cvDefaults';
import type { CVData } from '@/src/types/cv.types';

let failed = 0;

function fail(msg: string) {
  console.error('FAIL:', msg);
  failed++;
}

function assertEq(label: string, a: unknown, b: unknown) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) {
    fail(`${label}: expected ${sb}, got ${sa}`);
  }
}

function assertGte(label: string, a: number, min: number) {
  if (a < min) {
    fail(`${label}: expected >= ${min}, got ${a}`);
  }
}

function checkRoundTrip(source: CVData, label: string) {
  const payload = universalToProfilePayload(source);
  const roundTripped = migrateLegacyCVData(payload);

  // Identity fields
  assertEq(`${label} fullName`, roundTripped.personal.fullName, source.personal.fullName);
  assertEq(`${label} templateId`, roundTripped.meta.templateId, source.meta.templateId);
  assertEq(`${label} accent`, roundTripped.meta.colorScheme, source.meta.colorScheme);
  assertEq(`${label} font`, roundTripped.meta.fontFamily, source.meta.fontFamily);

  // Extended sections via cv_extra
  assertGte(`${label} publications`, roundTripped.publications.length, source.publications.length);
  assertGte(`${label} research`, roundTripped.research.length, source.research.length);
  assertGte(`${label} volunteer`, roundTripped.volunteer.length, source.volunteer.length);
  assertGte(`${label} interests`, roundTripped.interests.length, source.interests.length);
  assertGte(`${label} custom`, roundTripped.custom.length, source.custom.length);

  // Languages — native must survive
  const nativeLang = roundTripped.languages.find((l) => l.name === 'English');
  if (nativeLang?.proficiency !== 'native') {
    fail(`${label} language native: expected native, got ${nativeLang?.proficiency}`);
  }

  // References — full list (3 in fixture)
  assertGte(`${label} references`, roundTripped.references.length, 3);

  // Academic links
  if (source.personal.links.orcid) {
    if (!roundTripped.personal.links.orcid) {
      fail(`${label} ORCID link lost in round-trip`);
    }
  }
  if (source.personal.links.googleScholar) {
    if (!roundTripped.personal.links.googleScholar) {
      fail(`${label} Google Scholar link lost in round-trip`);
    }
  }

  // Education thesis (after Phase 2 fix)
  const thesisEdu = roundTripped.education.find((e) => e.thesis);
  const sourceThesis = source.education.find((e) => e.thesis);
  if (sourceThesis?.thesis && !thesisEdu?.thesis) {
    fail(`${label} education thesis lost in round-trip`);
  }

  console.log(`OK: ${label}`);
}

// Test 1: Full fixture round-trip
const full = getSampleCVData('#6C63FF');
full.meta.templateId = 'researcher';
checkRoundTrip(full, 'full fixture');

// Test 2: profileToUniversalCV round-trip via mock row
const payload = universalToProfilePayload(full);
const mockRow = {
  ...payload,
  id: 'test-id',
  user_id: 'user-id',
  name: 'Test CV',
  job_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as unknown as Parameters<typeof profileToUniversalCV>[0];
const fromProfile = profileToUniversalCV(mockRow);
assertGte('profileToUniversalCV publications', fromProfile.publications.length, 1);
console.log('OK: profileToUniversalCV');

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll round-trip checks passed.');
