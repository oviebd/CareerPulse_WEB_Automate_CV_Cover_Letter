export type CodeTokenKind =
  | 'plain'
  | 'keyword'
  | 'function'
  | 'string'
  | 'comment'
  | 'number'
  | 'type'
  | 'operator'
  | 'punctuation';

export type CodeToken = { kind: CodeTokenKind; text: string };

const KEYWORDS = new Set([
  'func',
  'function',
  'let',
  'var',
  'const',
  'if',
  'else',
  'elif',
  'switch',
  'case',
  'default',
  'return',
  'import',
  'from',
  'export',
  'class',
  'struct',
  'enum',
  'protocol',
  'extension',
  'async',
  'await',
  'try',
  'catch',
  'throw',
  'throws',
  'guard',
  'defer',
  'init',
  'self',
  'Self',
  'true',
  'false',
  'nil',
  'null',
  'undefined',
  'new',
  'public',
  'private',
  'internal',
  'static',
  'final',
  'override',
  'mutating',
  'where',
  'in',
  'for',
  'while',
  'break',
  'continue',
  'do',
  'typealias',
  'interface',
  'implements',
  'extends',
  'super',
  'this',
  'void',
  'int',
  'float',
  'double',
  'bool',
  'string',
  'weak',
  'unowned',
  'some',
  'any',
  'actor',
  'isolated',
  'inout',
]);

const TYPE_HINT =
  /\b[A-Z][A-Za-z0-9_]*\b|\b(?:String|Int|Bool|Double|Float|Void|Any|Optional|Result|Task|Actor|MainActor|URL|Data|Error)\b/;

function pushPlain(tokens: CodeToken[], text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === 'plain') {
    last.text += text;
    return;
  }
  tokens.push({ kind: 'plain', text });
}

export function highlightCodeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;

  while (i < line.length) {
    const rest = line.slice(i);

    if (rest.startsWith('//')) {
      tokens.push({ kind: 'comment', text: rest });
      break;
    }

    if (rest.startsWith('/*')) {
      const end = line.indexOf('*/', i);
      const chunk = end === -1 ? rest : line.slice(i, end + 2);
      tokens.push({ kind: 'comment', text: chunk });
      i += chunk.length;
      continue;
    }

    const stringMatch = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/);
    if (stringMatch) {
      tokens.push({ kind: 'string', text: stringMatch[0] });
      i += stringMatch[0].length;
      continue;
    }

    const numberMatch = rest.match(/^(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)/);
    if (numberMatch) {
      tokens.push({ kind: 'number', text: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }

    const wordMatch = rest.match(/^[@A-Za-z_][\w]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const afterWord = rest.slice(word.length);
      if (word.startsWith('@') || KEYWORDS.has(word.replace(/^@/, ''))) {
        tokens.push({ kind: 'keyword', text: word });
      } else if (TYPE_HINT.test(word)) {
        tokens.push({ kind: 'type', text: word });
      } else if (/^\s*\(/.test(afterWord)) {
        tokens.push({ kind: 'function', text: word });
      } else {
        pushPlain(tokens, word);
      }
      i += word.length;
      continue;
    }

    const opMatch = rest.match(/^(=>|\+\+|--|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~?:])/);
    if (opMatch) {
      tokens.push({ kind: 'operator', text: opMatch[0] });
      i += opMatch[0].length;
      continue;
    }

    const punctMatch = rest.match(/^[{()[\].,;]/);
    if (punctMatch) {
      tokens.push({ kind: 'punctuation', text: punctMatch[0] });
      i += punctMatch[0].length;
      continue;
    }

    pushPlain(tokens, rest[0]);
    i += 1;
  }

  return tokens.length ? tokens : [{ kind: 'plain', text: line }];
}

export function splitCodeLines(code: string): string[] {
  return code.replace(/\r\n/g, '\n').split('\n');
}
