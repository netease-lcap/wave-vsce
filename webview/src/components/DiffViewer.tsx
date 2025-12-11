import React, { useMemo, useEffect, useRef } from 'react';
import type { DiffBlock } from '../types';

interface DiffViewerProps {
  diffBlock: DiffBlock;
}

/**
 * Process diff result to render diff chunks with proper styling
 * Each diffResult entry can contain multiple lines in the value field
 */
const processDiffChunks = (diffResult: Array<{ value: string; added?: boolean; removed?: boolean; }>) => {
  return diffResult.map((chunk, index) => {
    let className = 'diff-chunk';
    let prefix = ' ';

    if (chunk.added) {
      className += ' diff-chunk-added';
      prefix = '+';
    } else if (chunk.removed) {
      className += ' diff-chunk-removed';
      prefix = '-';
    }

    // Keep the content as-is, including newlines
    const content = chunk.value;

    return {
      className,
      prefix,
      content,
      key: index
    };
  });
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ diffBlock }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Process diff data to get styled chunks
  const diffChunks = useMemo(() => {
    return processDiffChunks(diffBlock.diffResult);
  }, [diffBlock.diffResult]);

  // Find the first diff line (added or removed) for scrolling
  const firstDiffIndex = useMemo(() => {
    return diffChunks.findIndex(chunk => 
      chunk.className.includes('diff-chunk-added') || 
      chunk.className.includes('diff-chunk-removed')
    );
  }, [diffChunks]);

  // Auto-scroll to first diff line after component mounts
  useEffect(() => {
    if (firstDiffIndex >= 0 && contentRef.current) {
      const diffContentContainer = contentRef.current;
      const firstDiffElement = diffContentContainer.querySelector(
        `.diff-chunk:nth-child(${firstDiffIndex + 1})`
      ) as HTMLElement;
      
      if (firstDiffElement) {
        // Use setTimeout to ensure the element is rendered
        setTimeout(() => {
          // Simple approach: scroll the element into view within its container
          // Get the position of the element relative to the scrollable container
          const containerRect = diffContentContainer.getBoundingClientRect();
          const elementRect = firstDiffElement.getBoundingClientRect();
          
          // Calculate how much to scroll to bring the element into view
          const relativeTop = elementRect.top - containerRect.top;
          const currentScrollTop = diffContentContainer.scrollTop;
          
          // Scroll to position the diff line near the top of the container
          const newScrollTop = currentScrollTop + relativeTop - 20; // 20px from top
          
          diffContentContainer.scrollTo({
            top: Math.max(0, newScrollTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [firstDiffIndex]);

  return (
    <div className="diff-viewer-container" ref={containerRef}>
      <div className="diff-content" ref={contentRef}>
        {diffChunks.map((chunk) => (
          <div key={chunk.key} className={chunk.className}>
            <span className="diff-chunk-prefix">{chunk.prefix}</span>
            <span className="diff-chunk-content">{chunk.content}</span>
          </div>
        ))}
        {diffChunks.length === 0 && (
          <div className="diff-empty">No changes</div>
        )}
      </div>
    </div>
  );
};