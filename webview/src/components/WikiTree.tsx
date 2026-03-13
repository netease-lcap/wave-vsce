import React, { useState } from 'react';

interface WikiNode {
  name: string;
  path?: string;
  children?: WikiNode[];
}

interface WikiTreeProps {
  tree: WikiNode;
  onSelect: (path: string) => void;
  selectedPath: string | null;
  level?: number;
}

export const WikiTree: React.FC<WikiTreeProps> = ({ tree, onSelect, selectedPath, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = () => {
    if (tree.path) {
      onSelect(tree.path);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const isSelected = tree.path === selectedPath;
  const hasChildren = tree.children && tree.children.length > 0;

  return (
    <div className={`wiki-tree-node level-${level}`}>
      <div 
        className={`wiki-tree-item ${isSelected ? 'selected' : ''} ${hasChildren ? 'has-children' : ''}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {hasChildren && (
          <span className={`expand-icon codicon codicon-chevron-${isExpanded ? 'down' : 'right'}`} onClick={toggleExpand}></span>
        )}
        {!hasChildren && <span className="file-icon codicon codicon-file"></span>}
        <span className="node-name">{tree.name}</span>
      </div>
      {hasChildren && isExpanded && (
        <div className="wiki-tree-children">
          {tree.children!.map((child, index) => (
            <WikiTree 
              key={`${child.name}-${index}`} 
              tree={child} 
              onSelect={onSelect} 
              selectedPath={selectedPath} 
              level={level + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
