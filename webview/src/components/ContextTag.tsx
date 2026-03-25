import React from 'react';
import './ContextTag.css';

interface ContextTagProps {
  name: string;
  path: string;
  icon?: string;
  isImage?: boolean;
  onClick?: () => void;
}

export const ContextTag: React.FC<ContextTagProps> = ({ name, path, icon, isImage, onClick }) => {
  const isClickable = isImage && onClick;

  const handlePreview = (e: React.MouseEvent) => {
    if (isClickable) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
  };

  return (
    <span 
      className={`context-tag ${isClickable ? 'clickable' : ''}`}
      onClick={handlePreview}
      title={isClickable ? `点击预览 ${name}` : path}
      data-path={path}
    >
      <span className="tag-at">@</span>
      <span className="tag-name">{name}</span>
    </span>
  );
};
