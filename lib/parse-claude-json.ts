function stripMarkdownFence(text: string): string {
  return text.replace(/```json\s*|```/gi, '').trim();
}

/** Close truncated JSON arrays/objects so parse can succeed on cut-off model output. */
function repairTruncatedJson(text: string): string {
  let s = text.trim();
  // Drop trailing incomplete array element (common when output hits token limit)
  s = s.replace(/,\s*(\]|\})/g, '$1');
  s = s.replace(/,\s*"[^"]*"?\s*:\s*"[^"]*"?$/, '');
  s = s.replace(/,\s*\{[^}]*$/, '');
  s = s.replace(/,\s*"[^"]*$/, '');

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') stack.push(ch);
    if (ch === '}' && stack[stack.length - 1] === '{') stack.pop();
    if (ch === ']' && stack[stack.length - 1] === '[') stack.pop();
  }

  if (inString) s += '"';
  while (stack.length) {
    const open = stack.pop();
    s += open === '{' ? '}' : ']';
  }
  return s;
}

export function parseClaudeJson<T>(text: string): T {
  const stripped = stripMarkdownFence(text);

  try {
    return JSON.parse(stripped) as T;
  } catch {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = stripped.slice(start, end + 1);
      try {
        return JSON.parse(slice) as T;
      } catch {
        return JSON.parse(repairTruncatedJson(slice)) as T;
      }
    }
    throw new Error('invalid_json_response');
  }
}
