import puppeteer, { type Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }
  return browserInstance;
}

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await page.close();
  return Buffer.from(pdf);
}

export function injectTemplateData(
  templateHtml: string,
  data: Record<string, string>
): string {
  let result = templateHtml;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}
