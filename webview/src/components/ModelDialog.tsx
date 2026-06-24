/**
 * ModelDialog - Model selection dialog
 *
 * Opened via the /model slash command. Shows current model and fast model,
 * allows switching models for the current session.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ModelDialogProps, ConfigurationData } from '../types';
import '../styles/ConfigurationDialog.css';

const ModelDialog: React.FC<ModelDialogProps & { vscode: any }> = ({
  configurationData,
  onSave,
  onClose,
  vscode
}) => {
  const [model, setModel] = useState('');
  const [fastModel, setFastModel] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setModel(configurationData?.model || '');
    setFastModel(configurationData?.fastModel || '');
  }, [configurationData]);

  // Click outside / Escape to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSave({ model, fastModel });
  };

  return (
    <div className="configuration-dialog-overlay">
      <div ref={dialogRef} className="configuration-dialog">
        <div className="configuration-dialog-header">
          <h3>模型设置</h3>
        </div>

        <form onSubmit={handleSubmit} className="configuration-form">
          <div className="configuration-fields-scroll-area">
            <div className="configuration-field">
              <label htmlFor="model-select">Model:</label>
              <input
                id="model-select"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={configurationData?.envModel || '请输入模型名称 (或设置 WAVE_MODEL)'}
                autoFocus
              />
            </div>

            <div className="configuration-field">
              <label htmlFor="fast-model-select">Fast Model:</label>
              <input
                id="fast-model-select"
                type="text"
                value={fastModel}
                onChange={(e) => setFastModel(e.target.value)}
                placeholder={configurationData?.envFastModel || '请输入快速模型名称 (或设置 WAVE_FAST_MODEL)'}
              />
            </div>
          </div>

          <div className="configuration-actions">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="configuration-cancel-btn"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="configuration-save-btn"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelDialog;
