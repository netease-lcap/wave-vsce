import React, { useState, useCallback, KeyboardEvent, useEffect } from 'react';
import type { MessageInputProps } from '../types';

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled, 
  isStreaming, 
  onAbortMessage,
  shouldClearInput,
  onInputCleared
}) => {
  const [message, setMessage] = useState('');

  // Handle input clearing when requested by parent
  useEffect(() => {
    if (shouldClearInput) {
      setMessage('');
      onInputCleared?.();
    }
  }, [shouldClearInput, onInputCleared]);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  }, [message, disabled, onSendMessage]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    
    // Auto-resize textarea
    const target = event.target;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  }, []);

  return (
    <div className="input-container" data-testid="input-container">
      <div className="input-row">
        <textarea
          id="messageInput"
          className="message-input"
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="在这里输入您的消息..."
          rows={1}
          data-testid="message-input"
        />
        
        <button 
          className="abort-button" 
          id="abortButton" 
          onClick={onAbortMessage}
          style={{ display: isStreaming ? 'block' : 'none' }}
          data-testid="abort-btn"
        >
          停止
        </button>
        
        <button
          id="sendButton"
          className="send-button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          data-testid="send-btn"
        >
          发送
        </button>
      </div>
    </div>
  );
};