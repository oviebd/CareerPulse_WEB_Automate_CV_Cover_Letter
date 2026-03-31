type InferResult = {
  jobTitle: string | null;
  companyName: string | null;
};

function cleanValue(value: string): string | null {
  const v = value
    .replace(/\s+/g, ' ')
    .replace(/[|•·]/g, ' ')
    .trim();
  return v ? v : null;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function inferJobTitle(jd: string): string | null {
  const checks = [
    /(?:job\s*title|position|role)\s*[:\-]\s*([^\n\r|]{3,80})/i,
    /(?:hiring|seeking|looking for)\s+(?:an?\s+)?([a-z0-9/&,+.\- ]{3,80})/i,
  ];

  for (const re of checks) {
    const m = jd.match(re);
    if (m?.[1]) {
      const cleaned = cleanValue(m[1]);
      if (cleaned) return titleCase(cleaned);
    }
  }

  const lines = jd.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (
      /(engineer|developer|designer|manager|analyst|specialist|consultant|architect|lead|director|coordinator|intern|scientist)/i.test(
        line
      ) &&
      line.length <= 80
    ) {
      return cleanValue(line);
    }
  }
  return null;
}

function inferCompany(jd: string): string | null {
  const checks = [
    /(?:company|organization|organisation)\s*[:\-]\s*([^\n\r|]{2,80})/i,
    /(?:at|with|join)\s+([A-Z][A-Za-z0-9&,. \-]{1,80})/,
  ];
  for (const re of checks) {
    const m = jd.match(re);
    if (m?.[1]) {
      const cleaned = cleanValue(m[1]);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

export function inferRoleAndCompanyFromJobDescription(jobDescription: string): InferResult {
  const jd = jobDescription.trim();
  if (!jd) return { jobTitle: null, companyName: null };
  return {
    jobTitle: inferJobTitle(jd),
    companyName: inferCompany(jd),
  };
}
