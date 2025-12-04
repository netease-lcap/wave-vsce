import React from 'react';
import type { SessionSelectorProps, SessionMetadata } from '../types';

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  loading,
  error,
  disabled
}) => {
  const handleSessionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sessionId = event.target.value;
    if (sessionId && sessionId !== currentSession?.id) {
      onSessionSelect(sessionId);
    }
  };

  const formatSessionLabel = (session: SessionMetadata): string => {
    const date = new Date(session.lastActiveAt).toLocaleDateString();
    const time = new Date(session.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time} (${session.latestTotalTokens} tokens)`;
  };

  return (
    <div className="session-selector" data-testid="session-selector">
      <select
        value={currentSession?.id || ''}
        onChange={handleSessionChange}
        disabled={disabled || loading}
        className="session-dropdown"
        data-testid="session-dropdown"
      >
        <option value="" disabled>
          {loading ? '加载会话...' : error ? '会话加载失败' : '选择会话'}
        </option>
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {formatSessionLabel(session)}
          </option>
        ))}
      </select>
      {error && (
        <div className="session-error" data-testid="session-error">
          {error}
        </div>
      )}
    </div>
  );
};