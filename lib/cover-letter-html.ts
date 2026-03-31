import { injectTemplateData } from '@/lib/pdf';
import { resolveEffectiveTier } from '@/lib/dev-subscription';

export function buildCoverLetterVariables(
  cv: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin_url?: string | null;
  } | null,
  letter: {
    content: string;
    company_name: string | null;
    job_title: string | null;
    applicant_name?: string | null;
    applicant_role?: string | null;
    applicant_email?: string | null;
    applicant_phone?: string | null;
    applicant_location?: string | null;
  },
  accent: string
): Record<string, string> {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return {
    applicant_name: letter.applicant_name ?? cv?.full_name ?? '',
    applicant_email: letter.applicant_email ?? cv?.email ?? '',
    applicant_phone: letter.applicant_phone ?? cv?.phone ?? '',
    applicant_location: letter.applicant_location ?? cv?.location ?? '',
    applicant_linkedin: cv?.linkedin_url ?? '',
    company_name: letter.company_name ?? '',
    job_title: letter.applicant_role ?? letter.job_title ?? '',
    date: today,
    cover_letter_body: letter.content.replaceAll('\n', '<br/>'),
    primary_color: accent,
  };
}

export function applyCoverLetterWatermark(
  html: string,
  subscriptionTier: string | null | undefined
): string {
  const tier = resolveEffectiveTier(subscriptionTier);
  if (tier !== 'free') return html;
  return html.replace(
    '</body>',
    '<div style="position:fixed;bottom:10mm;right:10mm;font-size:9px;color:#64748b;">Created with CV&amp;CL — cvai.app</div></body>'
  );
}

/**
 * Injects a small <style> block into the rendered HTML so that when the page
 * is displayed inside a scaled preview iframe the body does NOT stretch to a
 * full A4 page and no scrollbar appears (which would clip the right edge).
 * This MUST NOT be applied to the PDF/print pipeline — only call it for
 * screen-preview responses.
 */
export function injectPreviewStyles(html: string): string {
  const previewCss = [
    'html,body{min-height:0!important;height:auto!important;}',
    'html{overflow:hidden!important;}',
    'body{overflow:visible!important;}',
  ].join('');
  return html.replace('</head>', `<style>${previewCss}</style></head>`);
}

export function renderCoverLetterPageHtml(
  templateHtml: string,
  vars: Record<string, string>,
  subscriptionTier: string | null | undefined,
  { preview = false }: { preview?: boolean } = {}
): string {
  let html = injectTemplateData(templateHtml, vars);
  html = applyCoverLetterWatermark(html, subscriptionTier);
  if (preview) html = injectPreviewStyles(html);
  return html;
}

export function sampleCoverLetterPlainText(): string {
  return [
    'I am writing to express my interest in the role. With several years of experience in similar positions, I am confident I can contribute from day one.',
    'In my current role, I have led cross-functional initiatives, improved key metrics, and collaborated closely with stakeholders. I would welcome the opportunity to bring that same focus to your team.',
    'Thank you for considering my application. I look forward to discussing how my background aligns with your needs.',
  ].join('\n\n');
}

export function getSampleCoverLetterPreviewVars(accent: string): Record<string, string> {
  return buildCoverLetterVariables(
    {
      full_name: 'Alex Rahman',
      email: 'alex.rahman@email.com',
      phone: '+1 555 010 2030',
      location: 'Dhaka, Bangladesh',
      linkedin_url: 'linkedin.com/in/alexrahman',
    },
    {
      content: sampleCoverLetterPlainText(),
      company_name: 'Acme Corp',
      job_title: 'Senior Product Manager',
    },
    accent
  );
}
