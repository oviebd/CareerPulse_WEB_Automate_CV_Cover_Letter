import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { ensureUserCredits } from '@/lib/credits/grant';
import { getCreditsRepo } from '@/lib/db/repositories/credits';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const balance = await ensureUserCredits(user.id);
  const rule = await getCreditsRepo().getActiveRule();

  return NextResponse.json({
    balance,
    rule: {
      input_token_unit: rule.input_token_unit,
      input_token_credits: rule.input_token_credits,
      output_token_unit: rule.output_token_unit,
      output_token_credits: rule.output_token_credits,
    },
  });
}
