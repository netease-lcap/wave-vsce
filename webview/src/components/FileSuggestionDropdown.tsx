import React, { useEffect, useRef } from 'react';
import { FileSuggestionDropdownProps, FileItem } from '../types';
import '../styles/FileSuggestionDropdown.css';

/**
 * FileSuggestionDropdown - A dropdown component for file suggestions
 *
 * This component displays a list of file suggestions when the user types @ in the message input.
 * It supports keyboard navigation and file icons using VS Code's codicon font.
 */
export const FileSuggestionDropdown: React.FC<FileSuggestionDropdownProps> = ({
  suggestions,
  isVisible,
  selectedIndex,
  onSelect,
  onClose,
  position,
  filterText,
  isLoading = false,
  hasKnowledgeBase = false
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVisible) return;

      const hasUploadOption = !filterText;
      const totalItems = suggestions.length + (hasUploadOption ? 1 : 0) + (hasUploadOption && hasKnowledgeBase ? 1 : 0);
      const minIndex = hasUploadOption ? (hasKnowledgeBase ? -2 : -1) : 0;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          if (selectedIndex > minIndex) {
            // This will be handled by parent component
          }
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (selectedIndex < suggestions.length - 1) {
            // This will be handled by parent component
          }
          break;
        case 'Enter':
          event.preventDefault();
          if (hasUploadOption && selectedIndex === -1) {
            // Handle upload option selection
            onSelect({
              path: '__upload__',
              relativePath: '__upload__',
              name: '上传本地文件',
              extension: '',
              icon: 'codicon-cloud-upload',
              isDirectory: false,
              isUploadOption: true
            });
          } else if (hasUploadOption && hasKnowledgeBase && selectedIndex === -2) {
            // Handle knowledge base option selection
            onSelect({
              path: '__kb__',
              relativePath: '__kb__',
              name: '知识库',
              extension: '',
              icon: 'codicon-library',
              isDirectory: true,
              isKnowledgeBaseOption: true
            });
          } else if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, selectedIndex, suggestions, onSelect, onClose, filterText]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (dropdownRef.current && selectedIndex >= -2) {
      const hasUploadOption = !filterText;
      const hasKB = hasUploadOption && hasKnowledgeBase;
      let actualIndex = selectedIndex;
      if (hasUploadOption) {
        if (hasKB) {
          actualIndex = selectedIndex + 2;
        } else {
          actualIndex = selectedIndex + 1;
        }
      }
      
      if (actualIndex >= 0 && actualIndex < dropdownRef.current.children.length) {
        const selectedElement = dropdownRef.current.children[actualIndex] as HTMLElement;
        if (selectedElement) {
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });
        }
      }
    }
  }, [selectedIndex, filterText]);

  if (!isVisible) {
    return null;
  }

  /**
   * Highlights matching text in the file name based on filter text
   */
  const highlightMatch = (text: string, filter: string): React.ReactNode => {
    if (!filter) return text;

    const lowerText = text.toLowerCase();
    const lowerFilter = filter.toLowerCase();
    const index = lowerText.indexOf(lowerFilter);

    if (index === -1) return text;

    return (
      <>
        {text.slice(0, index)}
        <span className="suggestion-highlight">
          {text.slice(index, index + filter.length)}
        </span>
        {text.slice(index + filter.length)}
      </>
    );
  };

  /**
   * Truncates long file paths for display
   */
  const truncatePath = (path: string, maxLength: number = 50): string => {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(path.length - maxLength + 3);
  };

  return (
    <div
      ref={dropdownRef}
      className="file-suggestion-dropdown"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Show knowledge base option only when there's no filter text and it's configured */}
      {!filterText && hasKnowledgeBase && (
        <div
          key="kb-option"
          className={`suggestion-item kb-option ${selectedIndex === -2 ? 'selected' : ''}`}
          onClick={() => onSelect({
            path: '__kb__',
            relativePath: '__kb__',
            name: '知识库',
            extension: '',
            icon: 'codicon-library',
            isDirectory: true,
            isKnowledgeBaseOption: true
          })}
        >
          <span className="suggestion-icon codicon codicon-library"></span>
          <div className="suggestion-content">
            <div className="suggestion-name">知识库</div>
            <div className="suggestion-path">浏览并选择知识库中的文件</div>
          </div>
        </div>
      )}

      {/* Show upload option only when there's no filter text */}
      {!filterText && (
        <div
          key="upload-option"
          className={`suggestion-item upload-option ${selectedIndex === -1 ? 'selected' : ''}`}
          onClick={() => onSelect({
            path: '__upload__',
            relativePath: '__upload__',
            name: '上传本地文件',
            extension: '',
            icon: 'codicon-cloud-upload',
            isDirectory: false,
            isUploadOption: true
          })}
        >
          <span className="suggestion-icon codicon codicon-cloud-upload"></span>
          <div className="suggestion-content">
            <div className="suggestion-name">上传本地文件</div>
            <div className="suggestion-path">选择本地文件上传到工作区</div>
          </div>
        </div>
      )}
      
      {suggestions.map((file: FileItem, index: number) => (
        <div
          key={file.path}
          className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSelect(file)}
          onMouseEnter={() => {
            // Optional: Update selected index on hover
            // This would need to be handled by parent component
          }}
        >
          <span className={`suggestion-icon codicon ${file.icon}`}></span>
          <div className="suggestion-content">
            <div className="suggestion-name">
              {highlightMatch(file.name, filterText)}
            </div>
            <div className="suggestion-path">
              {truncatePath(file.relativePath)}
            </div>
          </div>
        </div>
      ))}
      {isLoading && suggestions.length === 0 && (
        <div className="suggestion-item suggestion-empty">
          <span className="codicon codicon-loading"></span>
          <div className="suggestion-content">
            <div className="suggestion-name">正在搜索文件...</div>
            <div className="suggestion-path">请稍等</div>
          </div>
        </div>
      )}
      {!isLoading && suggestions.length === 0 && filterText && (
        <div className="suggestion-item suggestion-empty">
          <span className="codicon codicon-search"></span>
          <div className="suggestion-content">
            <div className="suggestion-name">未找到匹配的文件</div>
            <div className="suggestion-path">尝试修改搜索关键词</div>
          </div>
        </div>
      )}
      {!isLoading && suggestions.length === 0 && !filterText && (
        <div className="suggestion-item suggestion-empty">
          <span className="codicon codicon-folder"></span>
          <div className="suggestion-content">
            <div className="suggestion-name">开始输入文件名</div>
            <div className="suggestion-path">输入文件名或路径进行搜索</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSuggestionDropdown;