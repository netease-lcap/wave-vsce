/**
 * ConfigurationDialog - A form dialog for managing AI configuration settings
 *
 * This component appears above the configuration button when opened, similar to
 * the FileSuggestionDropdown pattern. It allows users to configure API settings
 * that are saved to VS Code's global state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConfigurationDialogProps, ConfigurationData } from '../types';
import '../styles/ConfigurationDialog.css';

const ConfigurationDialog: React.FC<ConfigurationDialogProps> = ({
  isVisible,
  configurationData,
  isLoading,
  error,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<ConfigurationData>({
    apiKey: '',
    baseURL: '',
    agentModel: '',
    fastModel: '',
    backendLink: ''
  });

  const isFormValid = !!(
    formData.apiKey?.trim() &&
    formData.baseURL?.trim() &&
    formData.agentModel?.trim() &&
    formData.fastModel?.trim()
  );

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
        if (isFormValid) {
          onCancel();
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFormValid) {
          onCancel();
        }
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
  }, [isVisible, onCancel, isFormValid]);

  const handleInputChange = (field: keyof ConfigurationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="configuration-dialog-overlay">
      <div
        ref={dialogRef}
        className="configuration-dialog"
      >
        <div className="configuration-dialog-header">
          <h3>配置设置</h3>
        </div>

        <form onSubmit={handleSubmit} className="configuration-form">
        <div className="configuration-field">
          <label htmlFor="apiKey">API Key <span className="required-star">*</span>:</label>
          <input
            id="apiKey"
            type="password"
            value={formData.apiKey || ''}
            onChange={(e) => handleInputChange('apiKey', e.target.value)}
            placeholder="输入 API Key"
            disabled={isLoading}
            required
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="baseURL">Base URL <span className="required-star">*</span>:</label>
          <input
            id="baseURL"
            type="url"
            value={formData.baseURL || ''}
            onChange={(e) => handleInputChange('baseURL', e.target.value)}
            placeholder="https://api.example.com"
            disabled={isLoading}
            required
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="agentModel">Agent Model <span className="required-star">*</span>:</label>
          <input
            id="agentModel"
            type="text"
            value={formData.agentModel || ''}
            onChange={(e) => handleInputChange('agentModel', e.target.value)}
            placeholder="请输入模型名称"
            disabled={isLoading}
            required
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="fastModel">Fast Model <span className="required-star">*</span>:</label>
          <input
            id="fastModel"
            type="text"
            value={formData.fastModel || ''}
            onChange={(e) => handleInputChange('fastModel', e.target.value)}
            placeholder="请输入快速模型名称"
            disabled={isLoading}
            required
          />
        </div>

        <div className="configuration-field">
          <label htmlFor="backendLink">后台链接:</label>
          <input
            id="backendLink"
            type="url"
            value={formData.backendLink || ''}
            onChange={(e) => handleInputChange('backendLink', e.target.value)}
            placeholder="知识库、代码地图后台链接"
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
            disabled={isLoading || !isFormValid}
            className="configuration-cancel-btn"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="configuration-save-btn"
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
};

export default ConfigurationDialog;