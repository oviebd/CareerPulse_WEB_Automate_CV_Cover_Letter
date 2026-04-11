import { existsSync, readFileSync } from 'fs';
import path from 'path';
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer';
import type { CVData } from '@/src/types/cv.types';
import { applyCvSectionVisibility } from '@/lib/cv-section-visibility';
import { TEMPLATE_CONFIGS } from '@/src/config/templateConfig';
import { normalizeTemplateId } from '@/src/utils/cvDefaults';
import type { TemplateId } from '@/src/types/cv.types';

let browser: Browser | null = null;

const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=none',
] as const;

function getPuppeteerLaunchOptions(): LaunchOptions {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) {
    return {
      headless: true,
      executablePath: envPath,
      args: [...PUPPETEER_ARGS],
    };
  }
  const bundled = puppeteer.executablePath();
  if (existsSync(bundled)) {
    return {
      headless: true,
      args: [...PUPPETEER_ARGS],
    };
  }
  return {
    headless: true,
    channel: 'chrome',
    args: [...PUPPETEER_ARGS],
  };
}

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch(getPuppeteerLaunchOptions());
  }
  return browser;
}

export async function closePdfBrowser(): Promise<void> {
  if (browser && browser.isConnected()) {
    await browser.close();
    browser = null;
  }
}

function safeScriptJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003c');
}

function templateDir(id: string): string {
  return path.join(process.cwd(), 'src', 'templates', id);
}

function readUtf8(p: string): string {
  return readFileSync(p, 'utf-8');
}

/**
 * Build printable HTML: inject CV JSON, template config, shared renderer, and CSS.
 */
export function renderUnifiedHtml(cvData: CVData): string {
  const data = applyCvSectionVisibility(cvData, cvData.sectionVisibility);
  const tid = normalizeTemplateId(data.meta.templateId) as TemplateId;
  const dir = templateDir(tid);
  const indexPath = path.join(dir, 'index.html');
  const stylePath = path.join(dir, 'style.css');
  const sharedBase = path.join(
    process.cwd(),
    'src',
    'templates',
    'shared',
    'base.css'
  );
  const sharedJs = path.join(
    process.cwd(),
    'src',
    'templates',
    'shared',
    'sections.js'
  );

  let html = readUtf8(indexPath);
  const styleCss = existsSync(stylePath) ? readUtf8(stylePath) : '';
  const baseCss = existsSync(sharedBase) ? readUtf8(sharedBase) : '';
  const sectionsJs = readUtf8(sharedJs);

  const cfg = TEMPLATE_CONFIGS[tid];
  const fontFam = (data.meta.fontFamily || 'Inter').trim() || 'Inter';
  const fontParam = encodeURIComponent(fontFam).replace(/%20/g, '+');
  const fontHref = `https://fonts.googleapis.com/css2?family=${fontParam}:wght@300;400;500;600;700&display=swap`;

  const pageSize = data.meta.pageSize === 'Letter' ? 'Letter' : 'A4';
  const pageRule = `@page { size: ${pageSize}; margin: 14mm 16mm; }`;
  const inlineCss = `<style>\n${pageRule}\n${baseCss}\n${styleCss}\n</style>`;
  html = html.replace('</head>', `${inlineCss}\n</head>`);

  html = html.replace(
    /<link\s+id="gf"\s+href="[^"]*"/,
    `<link id="gf" href="${fontHref}"`
  );

  const boot = `
<script>window.__CV_DATA__=${safeScriptJson(data)};</script>
<script>window.__TEMPLATE_CONFIG__=${safeScriptJson(cfg)};</script>
<script>\n${sectionsJs}\n</script>
`;
  html = html.replace('</body>', `${boot}\n</body>`);
  return html;
}

export async function generatePDFFromHtml(
  html: string,
  opts?: { pageSize?: 'A4' | 'Letter'; printBg?: boolean }
): Promise<Buffer> {
  const b = await getBrowser();
  const page = await b.newPage();
  const pageSize = opts?.pageSize ?? 'A4';
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page.setViewport({
    width: 1200,
    height: 1600,
    deviceScaleFactor: 1.5,
  });
  const pdf = await page.pdf({
    format: pageSize,
    printBackground: opts?.printBg ?? true,
    preferCSSPageSize: true,
    scale: 1,
  });
  await page.close();
  return Buffer.from(pdf);
}

export async function generateCVPdf(cvData: CVData): Promise<Buffer> {
  const html = renderUnifiedHtml(cvData);
  return generatePDFFromHtml(html, {
    pageSize: cvData.meta.pageSize ?? 'A4',
    printBg: true,
  });
}

export async function generateCVPreview(cvData: CVData): Promise<string> {
  const html = renderUnifiedHtml(cvData);
  const b = await getBrowser();
  const page = await b.newPage();
  await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page.setViewport({
    width: 794,
    height: 1123,
    deviceScaleFactor: 1.5,
  });
  const buf = await page.screenshot({ type: 'png', fullPage: true });
  await page.close();
  return Buffer.from(buf).toString('base64');
}
