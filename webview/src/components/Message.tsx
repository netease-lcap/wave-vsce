import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { MessageProps, TextBlock, ErrorBlock, ToolBlock, SubagentBlock, ImageBlock, CompressBlock, MemoryBlock } from '../types';
import { DiffViewer } from './DiffViewer';
import { TodoList } from './TodoList';
import { SubagentDisplay } from './SubagentDisplay';
import { MermaidRenderer } from './MermaidRenderer';
import '../styles/Message.css';

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

// Interface for parsed markdown content that may contain mermaid diagrams
interface ParsedMarkdownContent {
  elements: Array<{
    type: 'html' | 'mermaid';
    content: string;
    id?: string;
  }>;
}

// Parse markdown content and extract mermaid blocks
const parseMarkdownWithMermaid = (content: string): ParsedMarkdownContent => {
  if (!content || content.trim() === '') {
    return { elements: [] };
  }

  const elements: Array<{ type: 'html' | 'mermaid'; content: string; id?: string; }> = [];
  
  // Split content by mermaid blocks
  const parts = content.split(/(```mermaid\n[\s\S]*?\n```)/g);
  
  let mermaidIndex = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.match(/^```mermaid\n[\s\S]*?\n```$/)) {
      // This is a mermaid block
      const mermaidContent = part.replace(/^```mermaid\n/, '').replace(/\n```$/, '').trim();
      elements.push({
        type: 'mermaid',
        content: mermaidContent,
        id: `mermaid-${mermaidIndex++}`
      });
    } else if (part.trim()) {
      // This is regular markdown content
      const html = marked.parse(part);
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote'],
        ALLOWED_ATTR: ['href', 'title'],
        ALLOW_DATA_ATTR: false
      });
      
      if (sanitizedHtml.trim()) {
        elements.push({
          type: 'html',
          content: sanitizedHtml
        });
      }
    }
  }

  return { elements };
};

export const Message: React.FC<MessageProps> = (props) => {
  const { message, isStreaming = false, subagentMessages } = props;
  const getMessageClassName = () => {
    const classes = ['message'];
    
    if (message.role === 'user') {
      classes.push('user');
    } else if (message.role === 'assistant') {
      classes.push('assistant');
      if (isStreaming) {
        classes.push('streaming');
      }
    }
    
    return classes.join(' ');
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
              {(toolBlock.result || '').trim()}
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

    // Render tool error if it exists (with same style as error blocks)
    const errorContent = (toolBlock as any).error ? (
      <div className="tool-error">
        {escapeHtml((toolBlock as any).error)}
      </div>
    ) : null;

    // For Bash tools, add the bash-specific content below the header
    if (toolBlock.name === 'Bash') {
      const bashContent = renderBashIO(toolBlock);
      if (bashContent || errorContent) {
        return (
          <div key={index}>
            {toolHeader}
            {bashContent}
            {errorContent}
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
          {errorContent}
        </div>
      );
    }
    
    // For file editing tools, show diff below the header
    if (toolBlock.name && ['Write', 'Edit', 'MultiEdit'].includes(toolBlock.name)) {
      return (
        <div key={index}>
          {toolHeader}
          <DiffViewer toolBlock={toolBlock} />
          {errorContent}
        </div>
      );
    }
    
    // For other tools, show error if present
    if (errorContent) {
      return (
        <div key={index}>
          {toolHeader}
          {errorContent}
        </div>
      );
    }
    
    // For other tools without special content, just return the header
    return toolHeader;
  };

  const renderImageBlock = (imageBlock: ImageBlock, index: number) => {
    if (!imageBlock.imageUrls || imageBlock.imageUrls.length === 0) {
      return null;
    }

    const getImageTypeFromUrl = (url: string): string => {
      // Try to determine type from URL extension or default to IMG
      const extension = url.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'png': return 'PNG';
        case 'jpg':
        case 'jpeg': return 'JPG';
        case 'gif': return 'GIF';
        case 'webp': return 'WEBP';
        case 'svg': return 'SVG';
        default: return 'IMG';
      }
    };

    return (
      <div key={`image-${index}`} className="image-block">
        {imageBlock.imageUrls.map((imageUrl, imgIndex) => (
          <div key={`img-${index}-${imgIndex}`} className="image-item-message">
            <div className="image-icon">
              <span className="image-type">{getImageTypeFromUrl(imageUrl)}</span>
            </div>
            <div className="image-info">
              <span className="image-name">
                {`Image ${imgIndex + 1}`}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
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

  const renderBlock = (block: any, index: number) => {
    switch (block.type) {
      case 'text':
      case 'memory':
      case 'compress': {
        const content = block.content || '';
        if (!content.trim()) return null;
        
        if (message.role === 'user') {
          return (
            <pre key={index} className="message-content user-content">
              {content}
            </pre>
          );
        }

        const parsed = parseMarkdownWithMermaid(content);
        return (
          <div key={index} className="message-content-container">
            {parsed.elements.map((element, elIndex) => (
              element.type === 'mermaid' ? (
                <MermaidRenderer 
                  key={element.id || `mermaid-${index}-${elIndex}`}
                  content={element.content}
                />
              ) : (
                <div 
                  key={`html-${index}-${elIndex}`}
                  className="message-content markdown-content"
                  dangerouslySetInnerHTML={{ 
                    __html: element.content 
                  }}
                />
              )
            ))}
          </div>
        );
      }
      case 'error':
        return (
          <div key={index} className="message-content error">
            {escapeHtml(block.content || '')}
          </div>
        );
      case 'tool':
        return renderToolBlock(block as ToolBlock, index);
      case 'image':
        return renderImageBlock(block as ImageBlock, index);
      case 'subagent':
        return renderSubagentBlock(block as SubagentBlock, index);
      default:
        return null;
    }
  };

  return (
    <div className={getMessageClassName()}>
      {message.blocks?.map((block, index) => renderBlock(block, index))}
    </div>
  );
};