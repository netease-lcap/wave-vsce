import React from 'react';
import type { QueuedMessage } from '../types';
import '../styles/QueuedMessageList.css';

interface QueuedMessageListProps {
  queuedMessages: QueuedMessage[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDelete: (index: number) => void;
  onSend: (index: number) => void;
}

export const QueuedMessageList: React.FC<QueuedMessageListProps> = ({
  queuedMessages,
  isCollapsed,
  onToggleCollapse,
  onDelete,
  onSend
}) => {
  if (queuedMessages.length === 0) {
    return null;
  }

  return (
    <div className={`queued-message-list-container ${isCollapsed ? 'collapsed' : ''}`} data-testid="queued-message-list">
      <div className="queued-message-list-header" onClick={onToggleCollapse} title={isCollapsed ? "展开消息队列" : "折叠消息队列"}>
        <div className="queued-message-list-title">
          <span className={`codicon codicon-chevron-${isCollapsed ? 'right' : 'down'}`}></span>
          消息队列
        </div>
        <div className="queued-count">
          {queuedMessages.length} 条消息
        </div>
      </div>
      {!isCollapsed && (
        <div className="queued-items">
          {queuedMessages.map((qm, index) => (
            <div key={index} className="queued-item">
              <div className="queued-item-main">
                <div className="queued-item-content">
                  {qm.text || (qm.images && qm.images.length > 0 ? "[图片]" : "无内容")}
                </div>
                <div className="queued-item-actions">
                  {index === 0 && (
                    <button 
                      className="action-button send-now" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSend(index);
                      }}
                      title="立即发送"
                    >
                      <i className="codicon codicon-play"></i>
                    </button>
                  )}
                  <button 
                    className="action-button delete-queued" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(index);
                    }}
                    title="删除"
                  >
                    <i className="codicon codicon-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
