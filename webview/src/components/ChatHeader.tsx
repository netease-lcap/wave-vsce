import React from 'react';
import { SessionSelector } from './SessionSelector';
import type { ChatHeaderProps } from '../types';
import '../styles/ChatHeader.css';

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onClearChat,
  onAbortMessage,
  isStreaming,
  sessions,
  currentSession,
  onSessionSelect,
  sessionsLoading,
  sessionsError
}) => {
  return (
    <div className="chat-header" data-testid="chat-header">
      <div className="header-left">
        <SessionSelector
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={onSessionSelect}
          loading={sessionsLoading}
          error={sessionsError}
          disabled={isStreaming}
        />
      </div>
      <div className="header-buttons">
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