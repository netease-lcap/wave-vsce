import React from 'react';
import type { MessageProps, TextBlock, ErrorBlock, ToolBlock } from '../types';

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const Message: React.FC<MessageProps> = ({ message, isStreaming = false }) => {
  const getMessageClassName = () => {
    const classes = ['message'];
    
    if (message.role === 'user') {
      classes.push('user');
    } else if (message.role === 'assistant') {
      // Check if any block is an error block
      const hasErrorBlock = message.blocks?.some(block => block.type === 'error');
      if (hasErrorBlock) {
        classes.push('error');
      } else {
        classes.push('assistant');
        if (isStreaming) {
          classes.push('streaming');
        }
      }
    }
    
    return classes.join(' ');
  };

  const renderContent = () => {
    if (!message.blocks || message.blocks.length === 0) {
      return isStreaming ? '正在思考...' : '';
    }

    // Extract text content from blocks
    const textContent = message.blocks.map(block => {
      if (block.type === 'text') {
        const textBlock = block as TextBlock;
        return textBlock.content || '';
      } else if (block.type === 'error') {
        const errorBlock = block as ErrorBlock;
        return `错误: ${errorBlock.content || ''}`;
      }
      return '';
    }).filter(content => content.length > 0).join('');

    return textContent || (isStreaming ? '正在思考...' : '');
  };

  const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];

  return (
    <div className={getMessageClassName()}>
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ 
          __html: escapeHtml(renderContent()) 
        }}
      />
      
      {/* Render tool blocks separately */}
      {toolBlocks.map((block, index) => {
        const toolBlock = block as ToolBlock;
        return (
          <div key={index} className="tool-block">
            <div className="tool-header">🛠️ {toolBlock.name || 'Tool'}</div>
            <pre>{escapeHtml(toolBlock.parameters || '')}</pre>
          </div>
        );
      })}
    </div>
  );
};