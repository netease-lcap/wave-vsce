import React from 'react';
import type { SubagentBlock, Message } from '@wave-code-chat/shared-types';
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

  // Get live messages for this specific subagent
  let displayMessages: Message[] = [];
  if (subagentMessages && subagentMessages.has(subagentId)) {
    displayMessages = subagentMessages.get(subagentId) || [];
  }

  // Filter messages to only include those with tool blocks, then show last 2
  const messagesWithTools = displayMessages.filter(message => {
    const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];
    return toolBlocks.length > 0;
  });
  const recentMessages = messagesWithTools.slice(-2);

  // Count total tools across all messages
  const toolsCount = displayMessages.reduce((count, message) => {
    const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];
    return count + toolBlocks.length;
  }, 0);

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
          <div>
            <span className="subagent-type">🤖 {subagentName}</span>
            <span className="subagent-status" style={{ color: statusInfo.color }}>
              {statusInfo.icon} {statusInfo.text}
            </span>
          </div>
          <span className="tools-count">{toolsCount} tools</span>
          
        </div>
      </div>

      {recentMessages.length > 0 ? (
        <div className="subagent-messages">
          {recentMessages.map((message, index) => {
            // Create a new message containing only tool blocks
            const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];
            
            const toolOnlyMessage = {
              ...message,
              blocks: toolBlocks
            };
            
            return (
              <div key={index} className="subagent-message-wrapper">
                <MessageComponent message={toolOnlyMessage} isStreaming={false} />
              </div>
            );
          })}
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