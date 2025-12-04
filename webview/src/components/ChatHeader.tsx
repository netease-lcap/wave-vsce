import React from 'react';
import type { ChatHeaderProps } from '../types';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onClearChat,
  onAnalyzeWorkspace,
  onAbortMessage,
  isStreaming
}) => {
  return (
    <div className="chat-header" data-testid="chat-header">
      <div className="chat-title">Wave AI 聊天</div>
      <div className="header-buttons">
        <button
          className="header-button"
          onClick={onAnalyzeWorkspace}
          disabled={isStreaming}
          data-testid="analyze-project-btn"
        >
          分析项目
        </button>
        
        <button
          className="header-button"
          onClick={onClearChat}
          disabled={isStreaming}
          data-testid="clear-chat-btn"
        >
          清除聊天
        </button>
      </div>
    </div>
  );
};