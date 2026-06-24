/**
 * ConfigDialog - General settings dialog for AI configuration
 *
 * Opened via the /config slash command. Contains SSO authentication
 * and AI model/API configuration fields.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConfigDialogProps, ConfigurationData } from '../types';
import '../styles/ConfigurationDialog.css';

const ConfigDialog: React.FC<ConfigDialogProps & { vscode: any }> = ({
  configurationData,
  isLoading,
  error,
  onSave,
  onCancel,
  vscode
}) => {
  const [formData, setFormData] = useState<ConfigurationData>({
    serverUrl: '',
    baseURL: '',
    apiKey: '',
    headers: '',
    model: '',
    fastModel: '',
    language: 'Chinese'
  });

  // SSO auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // Fetch auth status on mount
  useEffect(() => {
    vscode?.postMessage({ command: 'getAuthStatus' });
    setAuthMessage('');
  }, [vscode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'authStatusResponse':
          setIsAuthenticated(message.isAuthenticated || false);
          setAuthUser(message.user || null);
          break;
        case 'loginResponse':
          if (message.success) {
            setIsAuthenticated(true);
            setAuthUser(message.user || null);
            setAuthLoading(false);
            setAuthMessage('登录成功');
          } else {
            setAuthLoading(false);
            setAuthMessage(message.error || '登录失败');
          }
          break;
        case 'logoutResponse':
          setIsAuthenticated(false);
          setAuthUser(null);
          setAuthMessage('已登出');
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = () => {
    setAuthLoading(true);
    setAuthMessage('');
    vscode?.postMessage({ command: 'login' });
  };

  const handleLogout = () => {
    vscode?.postMessage({ command: 'logout' });
  };

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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onCancel]);

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
          <div className="configuration-fields-scroll-area">
            <div className="configuration-field">
              <label htmlFor="serverUrl">服务端链接 (SSO):</label>
              <input
                id="serverUrl"
                type="url"
                value={formData.serverUrl || ''}
                onChange={(e) => handleInputChange('serverUrl', e.target.value)}
                placeholder={configurationData?.envServerUrl || 'WAVE_SERVER_URL'}
                disabled={isLoading}
              />
            </div>

            <div className="configuration-field sso-auth-section">
              <label>SSO 认证:</label>
              {isAuthenticated ? (
                <div className="sso-authenticated">
                  <div className="sso-user-info">
                    {authUser?.email && <span className="sso-email">{authUser.email}</span>}
                    <span className="sso-user-id">ID: {authUser?.id}</span>
                  </div>
                  <button
                    type="button"
                    className="sso-logout-btn"
                    onClick={handleLogout}
                    disabled={authLoading}
                  >
                    登出
                  </button>
                </div>
              ) : (
                <div className="sso-not-authenticated">
                  <button
                    type="button"
                    className="sso-login-btn"
                    onClick={handleLogin}
                    disabled={authLoading || (!formData.serverUrl && !configurationData?.envServerUrl)}
                  >
                    {authLoading ? '登录中...' : 'SSO 登录'}
                  </button>
                  {authMessage && (
                    <div className={`sso-message ${authMessage.includes('成功') ? 'success' : authMessage.includes('失败') ? 'error' : ''}`}>
                      {authMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="configuration-field">
              <label htmlFor="baseURL">Base URL:</label>
              <input
                id="baseURL"
                type="url"
                value={formData.baseURL || ''}
                onChange={(e) => handleInputChange('baseURL', e.target.value)}
                placeholder={configurationData?.envBaseUrl || 'https://api.example.com/v1 (或设置 WAVE_BASE_URL)'}
                disabled={isLoading}
              />
            </div>

            <div className="configuration-field">
              <label htmlFor="apiKey">API Key:</label>
              <input
                id="apiKey"
                type="password"
                value={formData.apiKey || ''}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder={configurationData?.envApiKey || '输入 API Key (或设置 WAVE_API_KEY 环境变量)'}
                disabled={isLoading}
              />
            </div>

            <div className="configuration-field">
              <label htmlFor="headers">Headers:</label>
              <textarea
                id="headers"
                value={formData.headers || ''}
                onChange={(e) => handleInputChange('headers', e.target.value)}
                placeholder={configurationData?.envHeaders || `Authorization: Bearer ...\nX-AIGW-APP: your_app_code\n(或设置 WAVE_CUSTOM_HEADERS)`}
                disabled={isLoading}
                className="configuration-textarea"
                rows={3}
              />
            </div>

            <div className="configuration-field">
              <label htmlFor="model">Model:</label>
              <input
                id="model"
                type="text"
                value={formData.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder={configurationData?.envModel || '请输入模型名称 (或设置 WAVE_MODEL)'}
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
                placeholder={configurationData?.envFastModel || '请输入快速模型名称 (或设置 WAVE_FAST_MODEL)'}
                disabled={isLoading}
              />
            </div>

            <div className="configuration-field">
              <label htmlFor="language">语言 (Language):</label>
              <select
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange('language', e.target.value)}
                disabled={isLoading}
                className="configuration-select"
              >
                <option value="Chinese">中文</option>
                <option value="English">英文</option>
              </select>
            </div>

            {error && (
              <div className="configuration-error">
                {error}
              </div>
            )}
          </div>

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
    </div>
  );
};

export default ConfigDialog;
