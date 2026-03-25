import React, { useEffect, useRef } from 'react';
import { PermissionMode, PermissionModeDropdownProps } from '../types';
import '../styles/PermissionModeDropdown.css';

const modes: { mode: PermissionMode; label: string; icon: string; description: string }[] = [
  { mode: 'default', label: '修改前询问', icon: 'codicon-edit', description: '修改前询问' },
  { mode: 'acceptEdits', label: '自动接受修改', icon: 'codicon-zap', description: '自动接受修改' },
  { mode: 'plan', label: '计划模式', icon: 'codicon-notebook', description: '计划模式' },
];

export const PermissionModeDropdown: React.FC<PermissionModeDropdownProps> = ({
  isVisible,
  currentMode,
  onSelect,
  onClose,
  triggerRef
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If clicking the trigger button, let the button's onClick handle it
      if (triggerRef.current?.contains(event.target as Node)) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose, triggerRef]);

  if (!isVisible) return null;

  return (
    <div className="permission-mode-dropdown">
      <div className="permission-mode-dropdown-content" ref={dropdownRef}>
        {modes.map((item) => (
          <div
            key={item.mode}
            className={`permission-mode-item ${currentMode === item.mode ? 'selected' : ''}`}
            onClick={() => onSelect(item.mode)}
            title={item.description}
          >
            <i className={`codicon ${item.icon}`}></i>
            <span className="mode-label">{item.label}</span>
            {currentMode === item.mode && <i className="codicon codicon-check"></i>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PermissionModeDropdown;
