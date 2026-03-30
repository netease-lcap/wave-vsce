import React, { useState, useId, ReactElement, useRef, useEffect } from 'react';
import '../styles/Tooltip.css';

interface TooltipProps {
  text: string;
  children: ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  offset?: number;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  children, 
  position = 'top',
  offset = 8,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!text || disabled) return children;

  const handleShow = () => setIsVisible(true);
  const handleHide = () => setIsVisible(false);

  return (
    <span 
      className="tooltip-container"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      ref={containerRef}
    >
      {React.cloneElement(children, {
        'aria-describedby': id
      })}
      <div 
        id={id} 
        role="tooltip" 
        className={`tooltip-box tooltip-${position} ${isVisible ? 'visible' : ''}`}
        style={{ '--tooltip-offset': `${offset}px` } as React.CSSProperties}
      >
        {text}
      </div>
    </span>
  );
};
