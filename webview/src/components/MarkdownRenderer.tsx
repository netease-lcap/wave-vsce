import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MermaidRenderer } from './MermaidRenderer';

interface MarkdownRendererProps {
  content: string;
  vscode: any;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, vscode }) => {
  const html = useMemo(() => {
    const rawHtml = marked.parse(content);
    return DOMPurify.sanitize(rawHtml as string);
  }, [content]);

  // Extract mermaid blocks from content
  const parts = useMemo(() => {
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    const result: Array<{ type: 'html' | 'mermaid'; content: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        const htmlBefore = marked.parse(textBefore);
        result.push({ type: 'html', content: DOMPurify.sanitize(htmlBefore as string) });
      }
      result.push({ type: 'mermaid', content: match[1] });
      lastIndex = mermaidRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      const htmlAfter = marked.parse(textAfter);
      result.push({ type: 'html', content: DOMPurify.sanitize(htmlAfter as string) });
    }

    return result;
  }, [content]);

  return (
    <div className="markdown-body">
      {parts.map((part, index) => (
        part.type === 'mermaid' ? (
          <MermaidRenderer key={index} content={part.content} vscode={vscode} />
        ) : (
          <div key={index} dangerouslySetInnerHTML={{ __html: part.content }} />
        )
      ))}
    </div>
  );
};
