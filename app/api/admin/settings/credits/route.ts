import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/roles';
import { getCreditsRepo } from '@/lib/db/repositories/credits';

export const runtime = 'nodejs';

export async function GET() {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const [activeRule, versions, initialFreeCredits] = await Promise.all([
    getCreditsRepo().getActiveRule(),
    getCreditsRepo().listRuleVersions(),
    getCreditsRepo().getInitialFreeCredits(),
  ]);

  return NextResponse.json({
    initial_free_credits: initialFreeCredits,
    active_rule: activeRule,
    versions,
  });
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json()) as {
    initial_free_credits?: number;
    input_token_unit?: number;
    input_token_credits?: number;
    output_token_unit?: number;
    output_token_credits?: number;
  };

  if (typeof body.initial_free_credits === 'number') {
    await getCreditsRepo().setInitialFreeCredits(Math.max(0, Math.round(body.initial_free_credits)), admin.id);
  }

  if (
    body.input_token_unit != null &&
    body.input_token_credits != null &&
    body.output_token_unit != null &&
    body.output_token_credits != null
  ) {
    await getCreditsRepo().saveCreditRule({
      input_token_unit: Math.max(1, Math.round(body.input_token_unit)),
      input_token_credits: Math.max(0, Math.round(body.input_token_credits)),
      output_token_unit: Math.max(1, Math.round(body.output_token_unit)),
      output_token_credits: Math.max(0, Math.round(body.output_token_credits)),
      createdBy: admin.id,
    });
  }

  return GET();
}
