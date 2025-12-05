import React, { useEffect, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    const scrollToBottom = () => {
      if (!containerRef.current || !messagesEndRef.current) return;

      const container = containerRef.current;
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      
      // Always scroll if streaming (user expects to see new content) or if user is near bottom
      if (streamingMessageIndex !== undefined || isNearBottom) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 10);
    return () => clearTimeout(timeoutId);
  }, [messages, streamingMessageIndex]);

  return (
    <div 
      ref={containerRef}
      id="messagesContainer" 
      className="messages-container" 
      data-testid="messages-container"
    >
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
      
      {/* Invisible div to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
};