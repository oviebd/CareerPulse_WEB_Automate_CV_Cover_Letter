export function parseClaudeJson<T>(text: string): T {
  const stripped = text.replace(/```json\s*|```/gi, '').trim();

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1)) as T;
    }
    throw new Error('invalid_json_response');
  }
}
