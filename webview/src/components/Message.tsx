import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageProps, TextBlock, ErrorBlock, ToolBlock, SubagentBlock } from '../types';
import { DiffViewer } from './DiffViewer';
import { TodoList } from './TodoList';
import { SubagentDisplay } from './SubagentDisplay';

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

export const Message: React.FC<MessageProps> = (props) => {
  const { message, isStreaming = false, subagentMessages } = props;
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
          // Only apply markdown rendering to assistant messages, not user messages
          if (message.role === 'user') {
            contentParts.push(escapeHtml(content));
          } else {
            contentParts.push(renderMarkdown(content));
          }
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
          contentParts.push(escapeHtml(content));
        }
      }
      // Other block types (compress, diff, etc.) are ignored in main content
    });

    return contentParts.join('');
  };

  const renderBashIO = (toolBlock: ToolBlock) => {
    const stage = toolBlock.stage;
    
    // Parse the command from parameters
    let command = '';
    let hasValidCommand = false;
    try {
      if (toolBlock.parameters) {
        const params = JSON.parse(toolBlock.parameters);
        command = params.command || '';
        hasValidCommand = !!command;
      }
    } catch {
      // If parsing fails, use compactParams or fallback
      command = toolBlock.compactParams || '';
      hasValidCommand = !!toolBlock.compactParams;
    }

    // Only render bash-specific content if we have a valid command and appropriate stage
    if ((stage === 'running' || stage === 'end') && hasValidCommand) {
      if (stage === 'running') {
        // Show only input during execution
        return (
          <div className="bash-command-input">
            <span className="bash-prompt">$</span>
            <span className="bash-command">{command}</span>
          </div>
        );
      } else if (stage === 'end') {
        // Show both input and output after execution in a unified block
        return (
          <div className="bash-command-unified">
            <div className="bash-command-input">
              <span className="bash-prompt">$</span>
              <span className="bash-command">{command}</span>
            </div>
            <div className="bash-command-output">
              {toolBlock.result || ''}
            </div>
          </div>
        );
      }
    }

    // For all other cases, return null (no additional content)
    return null;
  };

  const renderToolBlock = (toolBlock: ToolBlock, index: number) => {
    // Default tool rendering for all tools (including Bash)
    const compactInfo = toolBlock.compactParams || '';
    const toolHeader = (
      <div key={index} className="tool-block">
        🛠️ {toolBlock.name || 'Tool'}{compactInfo ? <span className="compact-params"> {compactInfo}</span> : ''}
      </div>
    );

    // For Bash tools, add the bash-specific content below the header
    if (toolBlock.name === 'Bash') {
      const bashContent = renderBashIO(toolBlock);
      if (bashContent) {
        return (
          <div key={index}>
            {toolHeader}
            {bashContent}
          </div>
        );
      }
    }
    
    // For TodoWrite tools, add the todo list below the header
    if (toolBlock.name === 'TodoWrite') {
      return (
        <div key={index}>
          {toolHeader}
          <TodoList toolBlock={toolBlock} />
        </div>
      );
    }
    
    // For file editing tools, show diff below the header
    if (toolBlock.name && ['Write', 'Edit', 'MultiEdit'].includes(toolBlock.name)) {
      return (
        <div key={index}>
          {toolHeader}
          <DiffViewer toolBlock={toolBlock} />
        </div>
      );
    }
    
    // For other tools without special content, just return the header
    return toolHeader;
  };

  const renderSubagentBlock = (subagentBlock: SubagentBlock, index: number) => {
    return (
      <div key={`subagent-${index}`}>
        <SubagentDisplay 
          subagentBlock={subagentBlock} 
          subagentMessages={props.subagentMessages} 
        />
      </div>
    );
  };

  const toolBlocks = message.blocks?.filter(block => block.type === 'tool') || [];
  const subagentBlocks = message.blocks?.filter(block => block.type === 'subagent') || [];
  const content = renderContent();

  // If hideContent is true and there are no tool/subagent blocks, don't render anything
  if (props.hideContent && toolBlocks.length === 0 && subagentBlocks.length === 0) {
    return null;
  }

  return (
    <div className={getMessageClassName()}>
      {/* Only render content div if there's actual content and hideContent is not true */}
      {!props.hideContent && content.trim() && (
        <div 
          className="message-content markdown-content"
          dangerouslySetInnerHTML={{ 
            __html: content 
          }}
        />
      )}
      
      {/* Render tool blocks separately */}
      {toolBlocks.map((block, index) => renderToolBlock(block as ToolBlock, index))}

      {/* Render subagent blocks separately */}
      {subagentBlocks.map((block, index) => renderSubagentBlock(block as SubagentBlock, index))}
    </div>
  );
};