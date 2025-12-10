import React from 'react';
import type { ConfirmationDialogProps } from '../types';
import '../styles/ConfirmationDialog.css';

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  confirmation,
  onConfirm,
  onReject,
}) => {
  const handleConfirm = () => {
    onConfirm(confirmation.confirmationId);
  };

  const handleReject = () => {
    onReject(confirmation.confirmationId);
  };

  return (
    <div className="confirmation-dialog">
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
  );
};