import { NextResponse } from 'next/server';
import { CLAUDE_MODEL } from '@/lib/claude';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckResult = {
  ok: boolean;
  detail?: string;
};

function envConfigured(name: string): CheckResult {
  const value = process.env[name]?.trim();
  return value ? { ok: true } : { ok: false, detail: 'not_set' };
}

async function checkPdfParser(): Promise<CheckResult> {
  try {
    const { ensurePdfjsServerReady } = await import('@/lib/pdfjs-server');
    await ensurePdfjsServerReady();
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'load_failed';
    console.error('health: pdf parser check failed', e);
    return { ok: false, detail: message.slice(0, 120) };
  }
}

export async function GET() {
  const checks = {
    anthropic_api_key: envConfigured('ANTHROPIC_API_KEY'),
    anthropic_model: {
      ok: Boolean(CLAUDE_MODEL),
      model: CLAUDE_MODEL,
    },
    supabase_url: envConfigured('NEXT_PUBLIC_SUPABASE_URL'),
    supabase_anon_key: envConfigured('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    pdf_parser: await checkPdfParser(),
  };

  const criticalOk =
    checks.anthropic_api_key.ok &&
    checks.supabase_url.ok &&
    checks.supabase_anon_key.ok;

  const status = criticalOk && checks.pdf_parser.ok ? 'ok' : 'degraded';
  const httpStatus = criticalOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}
