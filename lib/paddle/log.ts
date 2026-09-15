export function paddleLog(event: string, extra?: Record<string, unknown>) {
  const payload: Record<string, unknown> = { event, ...extra };
  delete payload.apiKey;
  delete payload.webhookSecret;
  delete payload.token;
  delete payload.authorization;
  console.warn(JSON.stringify(payload));
}
