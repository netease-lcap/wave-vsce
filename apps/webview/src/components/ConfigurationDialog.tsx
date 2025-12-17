/**
 * ConfigurationDialog - A form dialog for managing AI configuration settings
 *
 * This component appears above the configuration button when opened, similar to
 * the FileSuggestionDropdown pattern. It allows users to configure API settings
 * that are saved to ~/.wave/settings.json.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ConfigurationData } from '@wave-code-chat/shared-types';
import type { ConfigurationDialogProps } from '../types';
import '../styles/ConfigurationDialog.css';

const ConfigurationDialog: React.FC<ConfigurationDialogProps> = ({
  isVisible,
  configurationData,
  isLoading,
  error,
  onSave,
  onCancel,
  position
}) => {
  const [formData, setFormData] = useState<ConfigurationData>({
    apiKey: '',
    baseURL: '',
    agentModel: '',
    fastModel: ''
  });

  const dialogRef = useRef<HTMLDivElement>(null);

  // Update form data when configurationData prop changes
  useEffect(() => {
    if (configurationData) {
      setFormData(configurationData);
    }
  }, [configurationData]);

  // Handle clicking outside to close dialog
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible, onCancel]);

  const handleInputChange = (field: keyof ConfigurationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty strings to avoid writing them to settings.json
    const filteredData = Object.fromEntries(
      Object.entries(formData).filter(([_, value]) => value && value.trim() !== '')
    );
    onSave(filteredData);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="configuration-dialog"
      style={{
        top: position.top,
        left: position.left
      }}
    >
      <div className="configuration-dialog-header">
        <h3>配置设置</h3>
      </div>

      <form onSubmit={handleSubmit} className="configuration-form">
        <div className="configuration-field">
          <label htmlFor="apiKey">API Key:</label>
          <input
            id="apiKey"
            type="password"
            value={formData.apiKey || ''}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="输入 API Key"
            disabled={isLoading}
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="baseURL">Base URL:</label>
          <input
            id="baseURL"
            type="url"
            value={formData.baseURL || ''}
            onChange={(e) => handleInputChange('baseURL', e.target.value)}
            placeholder="https://api.example.com"
            disabled={isLoading}
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="agentModel">Agent Model:</label>
          <input
            id="agentModel"
            type="text"
            value={formData.agentModel || ''}
            onChange={(e) => handleInputChange('agentModel', e.target.value)}
            placeholder="claude-3-sonnet"
            disabled={isLoading}
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="fastModel">Fast Model:</label>
          <input
            id="fastModel"
            type="text"
            value={formData.fastModel || ''}
            onChange={(e) => handleInputChange('fastModel', e.target.value)}
            placeholder="claude-3-haiku"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="configuration-error">
            {error}
          </div>
        )}

        <div className="configuration-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="configuration-cancel-btn"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="configuration-save-btn"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfigurationDialog;