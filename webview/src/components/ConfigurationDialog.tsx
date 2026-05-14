/**
 * ConfigurationDialog - A form dialog for managing AI configuration settings
 *
 * This component appears above the configuration button when opened, similar to
 * the FileSuggestionDropdown pattern. It allows users to configure API settings
 * that are saved to VS Code's global state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ConfigurationDialogProps, ConfigurationData, PluginInfo, MarketplaceInfo, PluginScope } from '../types';
import '../styles/ConfigurationDialog.css';

const ConfigurationDialog: React.FC<ConfigurationDialogProps & { vscode: any }> = ({
  isVisible,
  configurationData,
  isLoading,
  error,
  onSave,
  onCancel,
  vscode // Add vscode to props
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'plugins'>('general');
  const [activePluginTab, setActivePluginTab] = useState<'explore' | 'installed' | 'marketplaces'>('explore');
  
  const [formData, setFormData] = useState<ConfigurationData>({
    aiUrl: '',
    apiKey: '',
    headers: '',
    baseURL: '',
    model: '',
    fastModel: '',
    language: 'Chinese'
  });

  // Plugin state
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceInfo[]>([]);
  const [newMarketplaceUrl, setNewMarketplaceUrl] = useState('');
  const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    if (isVisible && activeTab === 'plugins') {
      if (activePluginTab === 'explore' || activePluginTab === 'installed') {
        vscode?.postMessage({ command: 'listPlugins' });
      } else if (activePluginTab === 'marketplaces') {
        vscode?.postMessage({ command: 'listMarketplaces' });
      }
    }
    if (isVisible && activeTab === 'general') {
      vscode?.postMessage({ command: 'getAuthStatus' });
    }
    setSearchQuery('');
    setSelectedPlugin(null);
    setAuthMessage('');
  }, [isVisible, activeTab, activePluginTab, vscode]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'listPluginsResponse':
          setPlugins(message.plugins || []);
          break;
        case 'listMarketplacesResponse':
          setMarketplaces(message.marketplaces || []);
          break;
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

  const handleInstallPlugin = (pluginId: string, scope: PluginScope) => {
    vscode?.postMessage({ command: 'installPlugin', pluginId, scope });
    setSelectedPlugin(null); // Return to list after installation
  };

  const handleUninstallPlugin = (pluginId: string) => {
    vscode?.postMessage({ command: 'uninstallPlugin', pluginId });
  };

  const handleUpdatePlugin = (pluginId: string) => {
    vscode?.postMessage({ command: 'updatePlugin', pluginId });
  };

  const handleAddMarketplace = () => {
    if (newMarketplaceUrl) {
      vscode?.postMessage({ command: 'addMarketplace', input: newMarketplaceUrl });
      setNewMarketplaceUrl('');
    }
  };

  const handleRemoveMarketplace = (name: string) => {
    vscode?.postMessage({ command: 'removeMarketplace', name });
  };

  const handleUpdateMarketplace = (name?: string) => {
    vscode?.postMessage({ command: 'updateMarketplace', name });
  };

  const handleLogin = () => {
    setAuthLoading(true);
    setAuthMessage('');
    vscode?.postMessage({ command: 'login' });
  };

  const handleLogout = () => {
    vscode?.postMessage({ command: 'logout' });
  };

  const filteredPlugins = plugins.filter(p => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q));
  });

  const isFormValid = true;

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
          <div className="configuration-tabs">
            <button 
              className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              常规设置
            </button>
            <button 
              className={`tab-button ${activeTab === 'plugins' ? 'active' : ''}`}
              onClick={() => setActiveTab('plugins')}
            >
              插件
            </button>
          </div>
        </div>

        {activeTab === 'general' ? (
          <form onSubmit={handleSubmit} className="configuration-form">
            <div className="configuration-fields-scroll-area">
              <div className="configuration-field">
                <label htmlFor="aiUrl">AI URL:</label>
                <input
                  id="aiUrl"
                  type="url"
                  value={formData.aiUrl || ''}
                  onChange={(e) => handleInputChange('aiUrl', e.target.value)}
                  placeholder={configurationData?.envAiUrl || 'https://wave-ai.example.com (或设置 WAVE_AI_URL)'}
                  disabled={isLoading}
                />
              </div>

              <div className="sso-auth-section">
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
                      disabled={authLoading || (!formData.aiUrl && !configurationData?.envAiUrl)}
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
        ) : (
          <div className="plugins-container">
            <div className="plugin-tabs">
              <button 
                className={`plugin-tab ${activePluginTab === 'explore' ? 'active' : ''}`}
                onClick={() => setActivePluginTab('explore')}
              >
                探索新插件
              </button>
              <button 
                className={`plugin-tab ${activePluginTab === 'installed' ? 'active' : ''}`}
                onClick={() => setActivePluginTab('installed')}
              >
                已安装插件
              </button>
              <button 
                className={`plugin-tab ${activePluginTab === 'marketplaces' ? 'active' : ''}`}
                onClick={() => setActivePluginTab('marketplaces')}
              >
                插件市场
              </button>
            </div>

            <div className="plugin-content">
              {activePluginTab === 'explore' && (
                <div className="explore-plugins">
                  {selectedPlugin ? (
                    // Plugin detail view
                    <div className="plugin-detail">
                      <button className="back-button" onClick={() => { setSelectedPlugin(null); setSearchQuery(''); }}>
                        ← 返回列表
                      </button>
                      <div className="plugin-detail-header">
                        <div className="plugin-name">{selectedPlugin.name}</div>
                        {selectedPlugin.version && (
                          <div className="plugin-version">版本 {selectedPlugin.version}</div>
                        )}
                      </div>
                      {selectedPlugin.description && (
                        <div className="plugin-description">{selectedPlugin.description}</div>
                      )}
                      {selectedPlugin.marketplace && (
                        <div className="plugin-marketplace">来自市场: {selectedPlugin.marketplace}</div>
                      )}
                      <div className="install-options">
                        <h4>选择安装作用域</h4>
                        <button
                          className="install-option-btn"
                          onClick={() => handleInstallPlugin(selectedPlugin.id, 'user')}
                        >
                          <div className="install-option-title">为你安装 (user)</div>
                          <div className="install-option-desc">仅在你的用户配置中安装此插件</div>
                        </button>
                        <button
                          className="install-option-btn"
                          onClick={() => handleInstallPlugin(selectedPlugin.id, 'project')}
                        >
                          <div className="install-option-title">为此仓库的所有协作者安装 (project)</div>
                          <div className="install-option-desc">在项目配置中安装，团队成员共享</div>
                        </button>
                        <button
                          className="install-option-btn"
                          onClick={() => handleInstallPlugin(selectedPlugin.id, 'local')}
                        >
                          <div className="install-option-title">仅为你在此仓库中安装 (local)</div>
                          <div className="install-option-desc">仅在本地仓库配置中安装，不影响其他项目</div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Plugin list view
                    <div className="explore-list">
                      <div className="plugin-search">
                        <input
                          type="text"
                          placeholder="搜索插件..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="plugin-list">
                        {filteredPlugins.length > 0 ? (
                          filteredPlugins.map(plugin => (
                            <div
                              key={plugin.id}
                              className="plugin-item clickable"
                              onClick={() => setSelectedPlugin(plugin)}
                            >
                              <div className="plugin-info">
                                <div className="plugin-name">
                                  {plugin.name} <span className="plugin-version">{plugin.version}</span>
                                  {plugin.installed && plugin.scope && <span className="plugin-scope">[{plugin.scope}]</span>}
                                </div>
                                <div className="plugin-desc">{plugin.description}</div>
                                <div className="plugin-market">来自: {plugin.marketplace}</div>
                              </div>
                              <div className="plugin-chevron">›</div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            {searchQuery ? '没有找到匹配的插件' : '没有可探索的插件'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activePluginTab === 'installed' && (
                <div className="installed-plugins">
                  <div className="plugin-list">
                    {plugins.filter(p => p.installed && p.scope).length > 0 ? (
                      plugins.filter(p => p.installed && p.scope).map(plugin => (
                        <div key={plugin.id} className="plugin-item">
                          <div className="plugin-info">
                            <div className="plugin-name">
                              {plugin.name} 
                              <span className="plugin-version">{plugin.version}</span>
                              {plugin.scope && <span className="plugin-scope">[{plugin.scope}]</span>}
                            </div>
                            <div className="plugin-desc">{plugin.description}</div>
                          </div>
                          <div className="plugin-actions">
                            <button 
                              className="update-btn"
                              onClick={() => handleUpdatePlugin(plugin.id)}
                              title="更新插件"
                            >
                              更新
                            </button>
                            <button 
                              className="uninstall-btn"
                              onClick={() => handleUninstallPlugin(plugin.id)}
                              title="卸载插件"
                            >
                              卸载
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">没有已激活的插件</div>
                    )}
                  </div>
                </div>
              )}

              {activePluginTab === 'marketplaces' && (
                <div className="marketplaces-manager">
                  <div className="add-marketplace">
                    <input 
                      type="text" 
                      placeholder="市场 URL (本地路径, owner/repo, 或 Git URL)"
                      value={newMarketplaceUrl}
                      onChange={(e) => setNewMarketplaceUrl(e.target.value)}
                    />
                    <button className="add-btn" onClick={handleAddMarketplace}>添加</button>
                  </div>
                  <div className="marketplace-list">
                    {marketplaces.length > 0 ? (
                      marketplaces.map(m => (
                        <div key={m.name} className="marketplace-item">
                          <div className="marketplace-info">
                            <div className="marketplace-name">{m.name}</div>
                            <div className="marketplace-url">{m.url}</div>
                          </div>
                          <div className="marketplace-actions">
                            <button onClick={() => handleUpdateMarketplace(m.name)}>更新</button>
                            <button onClick={() => handleRemoveMarketplace(m.name)}>移除</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">没有已注册的市场</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="configuration-actions">
              <button
                type="button"
                onClick={onCancel}
                className="configuration-cancel-btn"
              >
                关闭
              </button>
            </div>
          </div>
        )}
    </div>
  </div>
  );
};

export default ConfigurationDialog;