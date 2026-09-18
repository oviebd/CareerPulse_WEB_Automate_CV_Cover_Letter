const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCareerPulseUserId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function userIdFromCustomData(customData: unknown): string | null {
  if (!customData || typeof customData !== 'object') return null;
  const data = customData as Record<string, unknown>;
  const candidate = data.careerPulseUserId ?? data.career_pulse_user_id;
  return isCareerPulseUserId(candidate) ? candidate : null;
}

export function checkoutCustomData(userId: string, planKey: string) {
  return {
    careerPulseUserId: userId,
    source: 'career_pulse_web',
    plan: planKey,
  };
}

export function packCheckoutCustomData(userId: string, packKey: string) {
  return {
    careerPulseUserId: userId,
    source: 'career_pulse_web',
    pack: packKey,
  };
}
