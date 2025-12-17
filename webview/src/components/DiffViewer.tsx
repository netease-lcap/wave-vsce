import React, { useMemo } from 'react';
import { diffLines, diffWords } from 'diff';
import { transformToolBlockToChanges } from '../utils/diffTransform';
import type { ToolBlock } from 'wave-agent-sdk';
import '../styles/DiffViewer.css';

interface DiffViewerProps {
  toolBlock: ToolBlock;
}

/**
 * DiffViewer component that extracts and displays diffs from tool blocks
 * Uses transformToolBlockToChanges from wave-agent-sdk to get file changes
 */
export const DiffViewer: React.FC<DiffViewerProps> = ({ toolBlock }) => {

  // Diff detection and transformation
  const changes = useMemo(() => {
    try {
      return transformToolBlockToChanges(toolBlock);
    } catch (error) {
      console.warn("Error transforming tool block to changes:", error);
      return [];
    }
  }, [toolBlock]);

  const showDiff =
    changes.length > 0 &&
    ["running", "end"].includes(toolBlock.stage) &&
    toolBlock.name &&
    ["Write", "Edit", "MultiEdit"].includes(toolBlock.name);

  // Render word-level diff for line-by-line comparison
  const renderWordLevelDiff = (
    oldLine: string,
    newLine: string,
    keyPrefix: string,
  ) => {
    const wordChanges = diffWords(oldLine, newLine);

    const removedParts: React.ReactNode[] = [];
    const addedParts: React.ReactNode[] = [];

    wordChanges.forEach((part, index) => {
      if (part.removed) {
        removedParts.push(
          <span
            key={`removed-${keyPrefix}-${index}`}
            className="diff-word-removed"
          >
            {part.value}
          </span>
        );
      } else if (part.added) {
        addedParts.push(
          <span
            key={`added-${keyPrefix}-${index}`}
            className="diff-word-added"
          >
            {part.value}
          </span>
        );
      } else {
        // Unchanged parts
        removedParts.push(
          <span key={`removed-unchanged-${keyPrefix}-${index}`} className="diff-word-unchanged">
            {part.value}
          </span>
        );
        addedParts.push(
          <span key={`added-unchanged-${keyPrefix}-${index}`} className="diff-word-unchanged">
            {part.value}
          </span>
        );
      }
    });

    return { removedParts, addedParts };
  };

  // Render expanded diff display using word-level diff for all scenarios
  const renderExpandedDiff = () => {
    if (changes.length === 0) return null;

    return (
      <div className="diff-changes">
        {changes.map((change, changeIndex) => {
          const lineDiffsResult = diffLines(
            change.oldContent || "",
            change.newContent || "",
          );

          // Extract removed and added lines for word-level comparison
          const removedLines: string[] = [];
          const addedLines: string[] = [];
          const contextLines: string[] = [];

          lineDiffsResult.forEach((part: any) => {
            if (part.removed) {
              removedLines.push(...part.value.split("\n").filter((line: string) => line !== ""));
            } else if (part.added) {
              addedLines.push(...part.value.split("\n").filter((line: string) => line !== ""));
            } else {
              contextLines.push(...part.value.split("\n").filter((line: string) => line !== ""));
            }
          });

          const diffLinesElements: React.ReactNode[] = [];

          // Handle context lines first
          contextLines.forEach((line, lineIndex) => {
            const { addedParts } = renderWordLevelDiff(
              line, 
              line, 
              `context-${changeIndex}-${lineIndex}`
            );
            diffLinesElements.push(
              <div
                key={`context-${changeIndex}-${lineIndex}`}
                className="diff-line diff-line-context"
              >
                <span className="diff-prefix"> </span>
                <span className="diff-content">{addedParts}</span>
              </div>
            );
          });

          // Pair removed and added lines for word-level diff
          const maxLines = Math.max(removedLines.length, addedLines.length);
          
          for (let i = 0; i < maxLines; i++) {
            const oldLine = removedLines[i] || "";
            const newLine = addedLines[i] || "";

            if (oldLine && newLine) {
              // Both lines exist - do word-level diff
              const { removedParts, addedParts } = renderWordLevelDiff(
                oldLine,
                newLine,
                `paired-${changeIndex}-${i}`
              );

              diffLinesElements.push(
                <div
                  key={`removed-${changeIndex}-${i}`}
                  className="diff-line diff-line-removed"
                >
                  <span className="diff-prefix">-</span>
                  <span className="diff-content">{removedParts}</span>
                </div>
              );

              diffLinesElements.push(
                <div
                  key={`added-${changeIndex}-${i}`}
                  className="diff-line diff-line-added"
                >
                  <span className="diff-prefix">+</span>
                  <span className="diff-content">{addedParts}</span>
                </div>
              );
            } else if (oldLine) {
              // Only removed line
              const { removedParts } = renderWordLevelDiff(
                oldLine,
                "",
                `removed-only-${changeIndex}-${i}`
              );

              diffLinesElements.push(
                <div
                  key={`removed-only-${changeIndex}-${i}`}
                  className="diff-line diff-line-removed"
                >
                  <span className="diff-prefix">-</span>
                  <span className="diff-content">{removedParts}</span>
                </div>
              );
            } else if (newLine) {
              // Only added line
              const { addedParts } = renderWordLevelDiff(
                "",
                newLine,
                `added-only-${changeIndex}-${i}`
              );

              diffLinesElements.push(
                <div
                  key={`added-only-${changeIndex}-${i}`}
                  className="diff-line diff-line-added"
                >
                  <span className="diff-prefix">+</span>
                  <span className="diff-content">{addedParts}</span>
                </div>
              );
            }
          }

          return (
            <div key={changeIndex} className="diff-change">
              {diffLinesElements}
            </div>
          );
        })}
      </div>
    );
  };

  // Don't render anything if no diff should be shown
  if (!showDiff) {
    return null;
  }

  return (
    <div className="diff-viewer-container">
      <div className="diff-viewer-content">
        {renderExpandedDiff()}
        {changes.length === 0 && (
          <div className="diff-empty">No changes</div>
        )}
      </div>
    </div>
  );
};