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
  sessionsError,
  tasks,
  isTaskListVisible,
  onToggleTaskList
}) => {
  const activeTasksCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

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
        {tasks.length > 0 && (
          <button
            className={`header-button ${isTaskListVisible ? 'active' : ''}`}
            onClick={onToggleTaskList}
            title="任务列表 (Ctrl+T)"
            data-testid="toggle-task-list-btn"
          >
            <span className="codicon codicon-checklist"></span>
            {activeTasksCount > 0 && (
              <span className="button-badge">{activeTasksCount}</span>
            )}
          </button>
        )}
        <button
          className="header-button"
          onClick={onClearChat}
          disabled={isStreaming}
          data-testid="clear-chat-btn"
          title="清除聊天"
        >
          <span className="codicon codicon-clear-all"></span>
        </button>
      </div>
    </div>
  );
};