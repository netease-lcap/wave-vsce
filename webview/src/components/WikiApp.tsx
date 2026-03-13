import React, { useState, useEffect, useCallback } from 'react';
import { WikiTree } from './WikiTree';
import { MarkdownRenderer } from './MarkdownRenderer';
import '../styles/wiki.css';

interface WikiAppProps {
  vscode: any;
}

export const WikiApp: React.FC<WikiAppProps> = ({ vscode }) => {
  const [wikiTree, setWikiTree] = useState<any>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[WikiApp] Received message:', message.command, message);
      switch (message.command) {
        case 'updateWikiTree':
          console.log('[WikiApp] Updating wiki tree:', message.wikiTree);
          setWikiTree(message.wikiTree);
          setIsGenerating(false);
          setIsLoading(false);
          break;
        case 'updatePageContent':
          if (message.path === selectedPath) {
            setContent(message.content);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'getWikiTree' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [vscode, selectedPath]);

  const handleGenerateWiki = () => {
    setIsGenerating(true);
    vscode.postMessage({ command: 'generateWiki' });
  };

  const handleSelectPage = (path: string) => {
    setSelectedPath(path);
    vscode.postMessage({ command: 'getPageContent', path });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="wiki-app">
      <div className="wiki-header">
        <button 
          className={`generate-button ${isGenerating ? 'loading' : ''}`} 
          onClick={handleGenerateWiki}
          disabled={isGenerating}
        >
          {isGenerating ? '正在生成...' : '生成文档'}
        </button>
        {wikiTree && (
          <button className="toggle-sidebar-button" onClick={toggleSidebar} title={isSidebarCollapsed ? "展开目录" : "收起目录"}>
            <i className={`codicon codicon-${isSidebarCollapsed ? 'layout-sidebar-left' : 'layout-sidebar-left-off'}`}></i>
          </button>
        )}
      </div>
      <div className="wiki-container">
        {!isSidebarCollapsed && wikiTree && Array.isArray(wikiTree) && wikiTree.length > 0 && (
          <div className="wiki-sidebar">
            {wikiTree.map((node, index) => (
              <WikiTree 
                key={`${node.path}-${index}`} 
                tree={node} 
                onSelect={handleSelectPage} 
                selectedPath={selectedPath} 
              />
            ))}
          </div>
        )}
        <div className={`wiki-content ${!wikiTree || !Array.isArray(wikiTree) || wikiTree.length === 0 || isSidebarCollapsed ? 'full-width' : ''}`}>
          {selectedPath ? (
            <MarkdownRenderer content={content} vscode={vscode} />
          ) : (
            <div className="welcome-screen">
              <h1>欢迎使用 WaveWiki</h1>
              <p>
                {isLoading ? '正在加载文档...' : 
                 (wikiTree && Array.isArray(wikiTree) && wikiTree.length > 0 ? '请从左侧目录选择一个页面查看。' : '暂无文档，请点击上方按钮生成。')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
