import React, { useRef, useEffect } from 'react';
import type { ConfirmationDialogProps } from '../types';
import '../styles/ConfirmationDialog.css';

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  confirmation,
  onConfirm,
  onReject,
}) => {
  const applyButtonRef = useRef<HTMLButtonElement>(null);
  const autoButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus on the Apply button when dialog opens
    if (applyButtonRef.current) {
      applyButtonRef.current.focus();
    }

    // Add keyboard listener for arrow keys
    const handleKeyDown = (e: KeyboardEvent) => {
      const buttons = [applyButtonRef.current, autoButtonRef.current, rejectButtonRef.current];
      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex]?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        buttons[nextIndex]?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation.confirmationId]);

  const handleConfirm = () => {
    onConfirm(confirmation.confirmationId);
  };

  const handleAutoConfirm = () => {
    let decision: any;
    if (confirmation.toolName === 'Bash') {
      const rule = confirmation.suggestedPrefix
        ? `Bash(${confirmation.suggestedPrefix}:*)`
        : `Bash(${confirmation.toolInput?.command})`;
      decision = {
        behavior: 'allow',
        newPermissionRule: rule,
      };
    } else {
      decision = {
        behavior: 'allow',
        newPermissionMode: 'acceptEdits',
      };
    }
    onConfirm(confirmation.confirmationId, decision);
  };

  const handleReject = () => {
    onReject(confirmation.confirmationId);
  };

  const getAutoOptionText = () => {
    if (confirmation.toolName === 'Bash') {
      if (confirmation.suggestedPrefix) {
        return `是，且不再询问：${confirmation.suggestedPrefix}`;
      }
      return "是，且在此工作目录下不再询问此命令";
    }
    return "是，且自动接受修改";
  };

  return (
    <div className="confirmation-dialog">
      <div className="confirmation-dialog-inner">
        <div className="confirmation-header">
          <div className="confirmation-title">
            {confirmation.confirmationType}
          </div>
          {confirmation.toolName === 'Bash' && confirmation.toolInput?.command && (
            <div className="confirmation-command">
              <code>{confirmation.toolInput.command}</code>
            </div>
          )}
          <div className="confirmation-details">
            <strong>工具:</strong> {confirmation.toolName}
          </div>
        </div>
        <div className="confirmation-actions">
          <button
            ref={applyButtonRef}
            className="confirmation-btn confirmation-btn-apply"
            onClick={handleConfirm}
          >
            <span className="btn-text">是</span>
          </button>
          <button
            ref={autoButtonRef}
            className="confirmation-btn confirmation-btn-auto"
            onClick={handleAutoConfirm}
          >
            <span className="btn-text">{getAutoOptionText()}</span>
          </button>
          <button
            ref={rejectButtonRef}
            className="confirmation-btn confirmation-btn-reject"
            onClick={handleReject}
          >
            <span className="btn-text">否</span>
          </button>
        </div>
      </div>
    </div>
  );
};