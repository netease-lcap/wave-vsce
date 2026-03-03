import React, { useEffect, useRef } from 'react';
import { Message } from './Message';
import type { MessageListProps } from '../types';
import '../styles/MessageList.css';

const welcomeMessage = {
  role: 'assistant' as const,
  blocks: [{ 
    type: 'text' as const, 
    content: '您好！我是您的 AI 助手。我可以帮助您处理当前项目、编写代码和修改文件。今天我能为您做些什么吗？'
  }]
};

export const MessageList: React.FC<MessageListProps> = ({ messages, streamingMessageIndex, vscode }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const prevMessagesLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when messages change, streaming updates, or subagent messages update
  useEffect(() => {
    const container = containerRef.current;
    const messagesEnd = messagesEndRef.current;
    if (!container || !messagesEnd) return;

    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth', force = false) => {
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 200;
      
      // Always scroll if:
      // 1. It's a brand new message
      // 2. We are currently streaming content
      // 3. The user is already near the bottom
      if (force || streamingMessageIndex !== undefined || isNearBottom) {
        messagesEnd.scrollIntoView({ behavior });
      }
    };

    // Use ResizeObserver to handle content height changes (images, diffs, etc.)
    const resizeObserver = new ResizeObserver(() => {
      // Use 'auto' for resize events to keep up with content growth without jitter
      scrollToBottom(streamingMessageIndex !== undefined ? 'auto' : 'smooth');
    });

    resizeObserver.observe(container);
    
    // Initial scroll for the dependency change
    // If it's a new message, we force the scroll
    scrollToBottom(streamingMessageIndex !== undefined ? 'auto' : 'smooth', isNewMessage);

    return () => {
      resizeObserver.disconnect();
    };
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
        vscode={vscode}
      />
      
      {/* Chat messages */}
      {messages.map((message, index) => {
        const isStreaming = streamingMessageIndex !== undefined && index === streamingMessageIndex;
        
        return (
          <Message
            key={`${message.role}-${index}`}
            message={message}
            isStreaming={isStreaming}
            vscode={vscode}
          />
        );
      })}
      
      {/* Invisible div to scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
};