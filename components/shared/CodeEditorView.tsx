'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  highlightCodeLine,
  splitCodeLines,
  type CodeTokenKind,
} from '@/lib/rich-text/highlight-code';
import { cn } from '@/lib/utils';

type Props = {
  code: string;
  language?: string;
  className?: string;
};

const TOKEN_CLASS: Record<CodeTokenKind, string> = {
  plain: 'rich-code-token-plain',
  keyword: 'rich-code-token-keyword',
  function: 'rich-code-token-function',
  string: 'rich-code-token-string',
  comment: 'rich-code-token-comment',
  number: 'rich-code-token-number',
  type: 'rich-code-token-type',
  operator: 'rich-code-token-operator',
  punctuation: 'rich-code-token-punctuation',
};

function TokenSpan({ kind, text }: { kind: CodeTokenKind; text: string }) {
  return <span className={TOKEN_CLASS[kind]}>{text}</span>;
}

export function CodeEditorView({ code, language, className }: Props) {
  const lines = useMemo(() => splitCodeLines(code), [code]);
  const [copied, setCopied] = useState(false);
  const label = language?.trim() || 'code';
  const gutterWidth = Math.max(String(lines.length).length, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      className={cn(
        'rich-code-editor overflow-hidden rounded-lg border border-[var(--color-border)] shadow-sm',
        className
      )}
    >
      <div className="rich-code-editor-toolbar flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
          {label}
        </span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-hover-surface)] hover:text-[var(--color-text-primary)]"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="py-3">
        {lines.map((line, lineIndex) => (
          <div key={`line-${lineIndex}`} className="flex">
            <div
              className="rich-code-editor-gutter shrink-0 select-none pl-3 pr-2 text-right font-mono text-xs leading-6"
              aria-hidden
              style={{ minWidth: `${gutterWidth + 2}ch` }}
            >
              {lineIndex + 1}
            </div>
            <pre className="m-0 min-w-0 flex-1 overflow-visible whitespace-pre-wrap break-words pr-3 font-mono text-xs leading-6">
              <code>
                {highlightCodeLine(line).map((token, tokenIndex) => (
                  <TokenSpan key={`t-${lineIndex}-${tokenIndex}`} kind={token.kind} text={token.text} />
                ))}
                {line.length === 0 ? '\u00a0' : null}
              </code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
