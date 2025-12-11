import React from 'react';
import type { SubagentBlock, Message } from '../types';
import { Message as MessageComponent } from './Message';
import '../styles/SubagentDisplay.css';

interface SubagentDisplayProps {
  subagentBlock: SubagentBlock;
  subagentMessages?: Map<string, Message[]>;
}

export const SubagentDisplay: React.FC<SubagentDisplayProps> = ({ subagentBlock, subagentMessages }) => {
  // Get subagent information directly from the SubagentBlock
  const subagentId = subagentBlock.subagentId;
  const subagentName = subagentBlock.subagentName;
  const status = subagentBlock.status;
  const configuration = subagentBlock.configuration;

  // Get live messages for this specific subagent
  let displayMessages: Message[] = [];
  if (subagentMessages && subagentMessages.has(subagentId)) {
    displayMessages = subagentMessages.get(subagentId) || [];
  }

  const messageCount = displayMessages.length;
  // Show last 2 messages, or all if fewer than 2
  const recentMessages = displayMessages.slice(-2);

  // Status display logic
  const getStatusInfo = () => {
    switch (status) {
      case 'active':
        return { icon: '⚡', text: '运行中', color: 'var(--vscode-charts-blue)' };
      case 'completed':
        return { icon: '✅', text: '已完成', color: 'var(--vscode-charts-green)' };
      case 'error':
        return { icon: '❌', text: '错误', color: 'var(--vscode-charts-red)' };
      case 'aborted':
        return { icon: '⏹️', text: '已中止', color: 'var(--vscode-charts-orange)' };
      default:
        return { icon: '⏳', text: '未知', color: 'var(--vscode-foreground)' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="subagent-display">
      <div className="subagent-info">
        <div className="subagent-header">
          <span className="subagent-type">🤖 {subagentName}</span>
          <span className="subagent-status" style={{ color: statusInfo.color }}>
            {statusInfo.icon} {statusInfo.text}
          </span>
        </div>
      </div>

      {recentMessages.length > 0 ? (
        <div className="subagent-messages">
          <div className="subagent-messages-header">
            <span className="messages-label">
              {messageCount > 2 ? `最新 ${recentMessages.length} 条，共 ${messageCount} 条消息:` : '消息:'}
            </span>
          </div>
          {recentMessages.map((message, index) => (
            <div key={index} className="subagent-message-wrapper">
              <MessageComponent message={message} isStreaming={false} />
            </div>
          ))}
        </div>
      ) : (
        <div className="subagent-status-area">
          <span className="status-indicator">
            {status === 'active' ? '⏳ 处理中...' : '⏳ 等待消息...'}
          </span>
        </div>
      )}
    </div>
  );
};