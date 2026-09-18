'use client';

/** Client mirror of NEXT_PUBLIC_SHOW_AI_USAGE (default visible). */

export function isAiUsageNavVisible(role: string | null | undefined): boolean {
  const flag = process.env.NEXT_PUBLIC_SHOW_AI_USAGE?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') {
    return role === 'super_admin';
  }
  return true;
}
