import React, { useMemo } from 'react';
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
  // Process diff data to get styled chunks
  const diffChunks = useMemo(() => {
    return processDiffChunks(diffBlock.diffResult);
  }, [diffBlock.diffResult]);

  return (
    <div className="diff-viewer-container">
      <div className="diff-content">
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