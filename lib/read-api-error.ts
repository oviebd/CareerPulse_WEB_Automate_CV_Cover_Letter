/**
 * Reads a JSON `{ error: string }` body from a failed fetch, logs the raw body,
 * and returns a user-facing message.
 */
export async function readApiErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    return fallback;
  }
  console.error(`[fetch] ${res.status}`, text);
  try {
    const j = JSON.parse(text) as {
      error?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    if (typeof j.error === 'string' && j.error.trim()) {
      const extra =
        typeof j.details === 'string' && j.details.trim()
          ? ` (${j.details})`
          : '';
      return `${j.error}${extra}`;
    }
  } catch {
    /* not JSON */
  }
  const t = text.trim();
  if (t.length > 0 && t.length < 800) return t;
  return fallback;
}
