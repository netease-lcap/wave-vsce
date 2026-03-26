/**
 * ConfigurationButton - A text-only button that triggers the configuration dialog
 *
 * This component provides a simple button labeled "配置" that opens the configuration
 * dialog when clicked. It follows the existing button patterns in the application.
 */

import React from 'react';
import { ConfigurationButtonProps } from '../types';
import '../styles/ConfigurationButton.css';

const ConfigurationButton: React.FC<ConfigurationButtonProps> = ({
  onClick,
  disabled = false
}) => {
  return (
    <button
      className="configuration-button"
      onClick={onClick}
      disabled={disabled}
      type="button"
      title="配置 AI 设置"
    >
      <i className="codicon codicon-settings"></i>
    </button>
  );
};

export default ConfigurationButton;