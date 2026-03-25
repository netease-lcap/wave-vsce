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

  return (
    <span 
      className={`context-tag ${isClickable ? 'clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
      title={path}
      data-path={path}
    >
      {icon && <i className={`codicon ${icon}`}></i>}
      <span className="tag-name">{name}</span>
    </span>
  );
};
