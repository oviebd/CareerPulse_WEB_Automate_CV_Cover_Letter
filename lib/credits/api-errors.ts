import { NextResponse } from 'next/server';
import { InsufficientCreditsError } from '@/lib/ai/anthropic-gateway';

export function insufficientCreditsResponse(balance?: number) {
  return NextResponse.json(
    {
      error: 'INSUFFICIENT_CREDITS',
      message: 'You do not have enough AI credits for this action.',
      balance: balance ?? 0,
    },
    { status: 402 }
  );
}

export function handleAiRouteError(e: unknown) {
  if (e instanceof InsufficientCreditsError) {
    return insufficientCreditsResponse(e.balance);
  }
  return null;
}
