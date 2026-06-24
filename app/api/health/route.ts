import { NextResponse } from 'next/server';
import { CLAUDE_MODEL, checkAnthropicConnectivity } from '@/lib/claude';
import { getSupabasePublicAnonKey } from '@/lib/supabase/public-env';

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

function checkSupabasePublicConfig(): {
  url: CheckResult;
  anon_key: CheckResult;
} {
  const url = envConfigured('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getSupabasePublicAnonKey();
  return {
    url,
    anon_key: anonKey
      ? { ok: true }
      : {
          ok: false,
          detail:
            'not_set — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.prod on the VPS',
        },
  };
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
  const supabase = checkSupabasePublicConfig();
  const anthropicApi = await checkAnthropicConnectivity();

  const checks = {
    anthropic_api_key: envConfigured('ANTHROPIC_API_KEY'),
    anthropic_api: anthropicApi,
    anthropic_model: {
      ok: Boolean(CLAUDE_MODEL),
      model: CLAUDE_MODEL,
    },
    supabase_url: supabase.url,
    supabase_anon_key: supabase.anon_key,
    pdf_parser: await checkPdfParser(),
  };

  const criticalOk =
    checks.anthropic_api_key.ok &&
    checks.anthropic_api.ok &&
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
