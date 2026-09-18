/** When false, only super_admin sees AI usage UI and /api/ai-usage. Default true for launch transparency. */

export function isAiUsageVisibleToUser(role: string | null | undefined): boolean {
  const flag = process.env.NEXT_PUBLIC_SHOW_AI_USAGE?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') {
    return role === 'super_admin';
  }
  return true;
}
