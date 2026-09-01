import { NextResponse } from 'next/server';
import { CLAUDE_MODEL, checkAnthropicConnectivity } from '@/lib/claude';
import { getDataBackend } from '@/lib/db/backend';

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

async function checkDatabase(): Promise<CheckResult> {
  try {
    const { checkDbConnection } = await import('@/lib/db');
    await checkDbConnection();
    return { ok: true, detail: 'postgres_connected' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'connection_failed';
    return { ok: false, detail: message.slice(0, 120) };
  }
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
  const backend = getDataBackend();
  const anthropicApi = await checkAnthropicConnectivity();
  const database = await checkDatabase();

  const checks = {
    data_backend: { ok: true, backend },
    database,
    anthropic_api_key: envConfigured('ANTHROPIC_API_KEY'),
    anthropic_api: anthropicApi,
    anthropic_model: {
      ok: Boolean(CLAUDE_MODEL),
      model: CLAUDE_MODEL,
    },
    auth_secret: envConfigured('AUTH_SECRET'),
    pdf_parser: await checkPdfParser(),
  };

  const criticalOk =
    checks.anthropic_api_key.ok &&
    checks.anthropic_api.ok &&
    checks.database.ok &&
    checks.auth_secret.ok;

  const status = criticalOk && checks.pdf_parser.ok ? 'ok' : 'degraded';
  const httpStatus = criticalOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      revision: 'postgres-only-v1',
      checks,
    },
    { status: httpStatus }
  );
}
