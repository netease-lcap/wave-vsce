import React, { useRef, useEffect } from 'react';
import type { ConfirmationDialogProps } from '../types';
import '../styles/ConfirmationDialog.css';

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  confirmation,
  onConfirm,
  onReject,
}) => {
  const applyButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus on the Apply button when dialog opens
    if (applyButtonRef.current) {
      applyButtonRef.current.focus();
    }
  }, [confirmation.confirmationId]);

  const handleConfirm = () => {
    onConfirm(confirmation.confirmationId);
  };

  const handleReject = () => {
    onReject(confirmation.confirmationId);
  };

  return (
    <div className="confirmation-dialog">
      <div className="confirmation-dialog-inner">
        <div className="confirmation-content">
          <div className="confirmation-text">
            {confirmation.confirmationType}
          </div>
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
            应用
          </button>
          <button
            className="confirmation-btn confirmation-btn-reject"
            onClick={handleReject}
          >
            拒绝
          </button>
        </div>
      </div>
    </div>
  );
};