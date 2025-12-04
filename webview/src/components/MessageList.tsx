import React from 'react';
import { Message } from './Message';
import type { MessageListProps } from '../types';

const welcomeMessage = {
  role: 'assistant' as const,
  blocks: [{ 
    type: 'text' as const, 
    content: '您好！我是您的 AI 助手。我可以帮助您处理当前项目、编写代码和修改文件。今天我能为您做些什么吗？'
  }]
};

export const MessageList: React.FC<MessageListProps> = ({ messages, streamingMessageIndex }) => {
  return (
    <div id="messagesContainer" className="messages-container" data-testid="messages-container">
      {/* Welcome message - always show */}
      <Message
        message={welcomeMessage}
        isStreaming={false}
      />
      
      {/* Chat messages */}
      {messages.map((message, index) => {
        const isStreaming = streamingMessageIndex !== undefined && index === streamingMessageIndex;
        
        return (
          <Message
            key={`${message.role}-${index}`}
            message={message}
            isStreaming={isStreaming}
          />
        );
      })}
    </div>
  );
};