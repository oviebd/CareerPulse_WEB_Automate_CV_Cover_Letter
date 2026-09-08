const BUILD_CV_PATH = '/cv/builder';

/** True when a marketing header link matches the current location. */
export function isMarketingNavActive(
  pathname: string,
  hash: string,
  href: string
): boolean {
  if (href.startsWith('/#')) {
    return pathname === '/' && normalizeHash(hash) === href.slice(1);
  }
  if (href === BUILD_CV_PATH) {
    return pathname === BUILD_CV_PATH || pathname.startsWith(`${BUILD_CV_PATH}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isBuildCvNavActive(pathname: string): boolean {
  return isMarketingNavActive(pathname, '', BUILD_CV_PATH);
}

function normalizeHash(hash: string): string {
  if (!hash) return '';
  return hash.startsWith('#') ? hash : `#${hash}`;
}
