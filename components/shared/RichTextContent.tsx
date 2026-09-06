'use client';

import { Fragment, type ReactNode } from 'react';
import { parseRichTextBlocks } from '@/lib/rich-text/parse-blocks';
import { CodeEditorView } from '@/components/shared/CodeEditorView';
import { cn } from '@/lib/utils';

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-inline-${i++}`;
    if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded border border-[var(--code-inline-border)] bg-[var(--code-inline-bg)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-text-primary)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-[var(--color-text-primary)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : [text];
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: 'mt-1 text-base font-semibold text-[var(--color-text-primary)] first:mt-0',
  2: 'mt-4 text-sm font-semibold text-[var(--color-text-primary)] first:mt-0',
  3: 'mt-3 text-sm font-medium text-[var(--color-text-primary)] first:mt-0',
};

type Props = {
  content: string;
  className?: string;
};

/** Renders interview prep markdown: headings, lists, inline/fenced code, bold, paragraphs. */
export function RichTextContent({ content, className }: Props) {
  const blocks = parseRichTextBlocks(content);
  if (!blocks.length) return null;

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed text-[var(--color-text-primary)]', className)}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5';
          return (
            <Tag key={`h-${index}`} className={HEADING_CLASS[block.level]}>
              {renderInline(block.text, `h-${index}`)}
            </Tag>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={`p-${index}`}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={`p-${index}-${lineIndex}`}>
                  {lineIndex > 0 ? <br /> : null}
                  {renderInline(line, `p-${index}-${lineIndex}`)}
                </Fragment>
              ))}
            </p>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul
              key={`ul-${index}`}
              className="list-disc space-y-1.5 pl-5 marker:text-[var(--color-primary)]"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ul-${index}-${itemIndex}`}>{renderInline(item, `ul-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'ol') {
          return (
            <ol
              key={`ol-${index}`}
              className="list-decimal space-y-1.5 pl-5 marker:text-[var(--color-primary)]"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`ol-${index}-${itemIndex}`}>{renderInline(item, `ol-${index}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        return <CodeEditorView key={`code-${index}`} code={block.text} language={block.language} />;
      })}
    </div>
  );
}
