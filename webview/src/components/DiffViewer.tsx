import React, { useMemo } from 'react';
import { diffLines, diffWords } from 'diff';
import { transformToolBlockToChanges } from '../utils/diffTransform';
import type { ToolBlock } from '../types';
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
    try {
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
    } catch (error) {
      console.warn("Error rendering word-level diff:", error);
      // Fallback to simple line display
      return {
        removedParts: [
          <span key={`fallback-removed-${keyPrefix}`} className="diff-word-unchanged">
            {oldLine}
          </span>
        ],
        addedParts: [
          <span key={`fallback-added-${keyPrefix}`} className="diff-word-unchanged">
            {newLine}
          </span>
        ],
      };
    }
  };

  // Render expanded diff display using diffLines with word-level support
  const renderExpandedDiff = () => {
    try {
      if (changes.length === 0) return null;

      return (
        <div className="diff-changes">
          {changes.map((change, changeIndex) => {
            try {
              const lineDiffs = diffLines(
                change.oldContent || "",
                change.newContent || "",
              );

              // For simple single-line changes, use word-level diff
              const isSingleLineChange =
                !change.oldContent.includes("\n") &&
                !change.newContent.includes("\n") &&
                change.oldContent.trim() !== "" &&
                change.newContent.trim() !== "";

              if (isSingleLineChange) {
                const { removedParts, addedParts } = renderWordLevelDiff(
                  change.oldContent,
                  change.newContent,
                  `change-${changeIndex}`,
                );

                return (
                  <div key={changeIndex} className="diff-change">
                    <div className="diff-line diff-line-removed">
                      <span className="diff-prefix">-</span>
                      <span className="diff-content">{removedParts}</span>
                    </div>
                    <div className="diff-line diff-line-added">
                      <span className="diff-prefix">+</span>
                      <span className="diff-content">{addedParts}</span>
                    </div>
                  </div>
                );
              }

              // For multi-line changes, use line-level diff
              return (
                <div key={changeIndex} className="diff-change">
                  {lineDiffs.map((part, partIndex) => {
                    if (part.added) {
                      return part.value
                        .split("\n")
                        .filter((line) => line !== "")
                        .map((line, lineIndex) => (
                          <div
                            key={`add-${changeIndex}-${partIndex}-${lineIndex}`}
                            className="diff-line diff-line-added"
                          >
                            <span className="diff-prefix">+</span>
                            <span className="diff-content">{line}</span>
                          </div>
                        ));
                    } else if (part.removed) {
                      return part.value
                        .split("\n")
                        .filter((line) => line !== "")
                        .map((line, lineIndex) => (
                          <div
                            key={`remove-${changeIndex}-${partIndex}-${lineIndex}`}
                            className="diff-line diff-line-removed"
                          >
                            <span className="diff-prefix">-</span>
                            <span className="diff-content">{line}</span>
                          </div>
                        ));
                    } else {
                      // Context lines - show unchanged content
                      return part.value
                        .split("\n")
                        .filter((line) => line !== "")
                        .map((line, lineIndex) => (
                          <div
                            key={`context-${changeIndex}-${partIndex}-${lineIndex}`}
                            className="diff-line diff-line-context"
                          >
                            <span className="diff-prefix"> </span>
                            <span className="diff-content">{line}</span>
                          </div>
                        ));
                    }
                  })}
                </div>
              );
            } catch (error) {
              console.warn(
                `Error rendering diff for change ${changeIndex}:`,
                error,
              );
              // Fallback to simple display
              return (
                <div key={changeIndex} className="diff-change">
                  <div className="diff-line diff-line-removed">
                    <span className="diff-prefix">-</span>
                    <span className="diff-content">{change.oldContent || ""}</span>
                  </div>
                  <div className="diff-line diff-line-added">
                    <span className="diff-prefix">+</span>
                    <span className="diff-content">{change.newContent || ""}</span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      );
    } catch (error) {
      console.warn("Error rendering expanded diff:", error);
      return (
        <div className="diff-error">
          <span>Error rendering diff display</span>
        </div>
      );
    }
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