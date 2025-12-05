import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageProps, TextBlock, ErrorBlock, ToolBlock } from '../types';

// Configure marked for VS Code webview context
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true // GitHub Flavored Markdown
});

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Render markdown content with sanitization
const renderMarkdown = (content: string): string => {
  if (!content || content.trim() === '') {
    return '';
  }
  
  // Parse markdown to HTML
  const html = marked.parse(content);
  
  // Sanitize HTML to prevent XSS while preserving formatting
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false
  });
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
      return '';
    }

    // Process blocks differently based on type
    const contentParts: string[] = [];
    
    message.blocks.forEach(block => {
      if (block.type === 'text') {
        const textBlock = block as TextBlock;
        const content = textBlock.content || '';
        if (content.trim()) {
          // Apply markdown rendering to text blocks
          contentParts.push(renderMarkdown(content));
        }
      } else if (block.type === 'memory') {
        // Apply markdown rendering to memory blocks for better readability
        const memoryBlock = block as any; // Memory block type not imported
        const content = memoryBlock.content || '';
        if (content) {
          contentParts.push(renderMarkdown(content));
        }
      } else if (block.type === 'error') {
        const errorBlock = block as ErrorBlock;
        const content = errorBlock.content || '';
        if (content) {
          // Keep error content as plain text for clarity
          contentParts.push(escapeHtml(`错误: ${content}`));
        }
      }
      // Other block types (compress, etc.) are ignored in main content
    });

    return contentParts.join('');
  };

  const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];
  const content = renderContent();

  return (
    <div className={getMessageClassName()}>
      {/* Only render content div if there's actual content */}
      {content.trim() && (
        <div 
          className="message-content markdown-content"
          dangerouslySetInnerHTML={{ 
            __html: content 
          }}
        />
      )}
      
      {/* Render tool blocks separately */}
      {toolBlocks.map((block, index) => {
        const toolBlock = block as ToolBlock;
        const compactInfo = toolBlock.compactParams || '';
        return (
          <div key={index} className="tool-block">
            🛠️ {toolBlock.name || 'Tool'}{compactInfo ? <span className="compact-params"> {compactInfo}</span> : ''}
          </div>
        );
      })}
    </div>
  );
};