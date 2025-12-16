import React, { useState, useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import '../styles/MermaidRenderer.css';

interface MermaidRendererProps {
  content: string;
  className?: string;
}

let mermaidInitialized = false;

// Clean and validate mermaid syntax
const cleanMermaidSyntax = (content: string): string => {
  return content
    .trim()
    // Remove trailing semicolons which can cause issues
    .replace(/;\s*$/gm, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove extra whitespace
    .replace(/\s+$/gm, '');
};

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ content, className = '' }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'source'>('preview');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const mermaidRef = useRef<HTMLDivElement>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout>();
  const cleanedContent = useRef<string>('');
  const lastRenderedContent = useRef<string>(''); // Track what was last rendered

  // Initialize mermaid configuration once
  useEffect(() => {
    if (!mermaidInitialized) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'var(--vscode-font-family, monospace)',
          deterministicIds: true,
          deterministicIDSeed: 'wave-vscode',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: {
            useMaxWidth: true,
            wrap: true,
            showSequenceNumbers: true
          },
          gantt: {
            useMaxWidth: true,
            leftPadding: 75,
            gridLineStartPadding: 35
          },
          class: {
            useMaxWidth: true
          },
          state: {
            useMaxWidth: true
          },
          pie: {
            useMaxWidth: true
          },
          logLevel: 'error',
          maxTextSize: 50000,
          maxEdges: 500,
          dompurifyConfig: {
            USE_PROFILES: { html: true }
          }
        });
        mermaidInitialized = true;
      } catch (err) {
        console.error('Failed to initialize mermaid:', err);
      }
    }
  }, []);

  // Clean content when it changes
  useEffect(() => {
    cleanedContent.current = cleanMermaidSyntax(content);
  }, [content]);

  // Render mermaid diagram when switching to preview or content changes
  useEffect(() => {
    if (activeTab === 'preview' && cleanedContent.current.trim()) {
      // Clear any existing timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      
      // Check if we need to re-render or just re-insert existing SVG
      const contentChanged = cleanedContent.current !== lastRenderedContent.current;
      const domIsEmpty = !mermaidRef.current?.innerHTML?.trim();
      
      if (contentChanged || !svgContent) {
        // Content changed or no SVG - need full re-render
        renderTimeoutRef.current = setTimeout(() => {
          renderMermaid();
        }, 100);
      } else if (svgContent && domIsEmpty && mermaidRef.current) {
        // Have SVG but DOM is empty - just re-insert
        try {
          mermaidRef.current.innerHTML = svgContent;
        } catch (err) {
          console.error('Error re-inserting SVG:', err);
          // If re-insertion fails, do a full re-render
          renderTimeoutRef.current = setTimeout(() => {
            renderMermaid();
          }, 100);
        }
      }
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [activeTab, content, svgContent]);

  const renderMermaid = useCallback(async () => {
    if (!cleanedContent.current.trim()) {
      return;
    }

    setIsRendering(true);
    setError(null);
    
    try {
      // Generate a new unique ID for each render to avoid conflicts
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Basic syntax validation - updated for Mermaid 11.x
      const diagramContent = cleanedContent.current;
      
      if (!diagramContent.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|gantt|pie|gitGraph|journey|quadrantChart|requirementDiagram|erDiagram|mindmap|timeline|sankey|block-beta|xychart-beta|packet-beta|architecture-beta|c4Context|c4Container|c4Component|c4Dynamic|c4Deployment)/)) {
        throw new Error('Invalid diagram type. Please start with a valid Mermaid diagram declaration.');
      }
      
      // Ensure we have a valid DOM reference before proceeding
      if (!mermaidRef.current) {
        throw new Error('Mermaid container not available');
      }
      
      // Clear any existing SVG content first
      mermaidRef.current.innerHTML = '';
      
      // Create a temporary container for mermaid to work with
      // This helps avoid DOM manipulation issues
      const tempDiv = document.createElement('div');
      tempDiv.id = id;
      tempDiv.style.visibility = 'hidden';
      document.body.appendChild(tempDiv);
      
      try {
        // Render the mermaid diagram with temporary container
        const result = await mermaid.render(id, diagramContent);
        
        // Set the SVG content and track what was rendered
        setSvgContent(result.svg);
        lastRenderedContent.current = diagramContent;
        
      } finally {
        // Clean up temporary container
        if (tempDiv.parentNode) {
          tempDiv.parentNode.removeChild(tempDiv);
        }
      }
      
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
      
      // Provide helpful error messages
      if (errorMessage.includes('Parse error') || errorMessage.includes('syntax')) {
        setError(`Syntax error: ${errorMessage}. Please check your diagram syntax.`);
      } else if (errorMessage.includes('firstChild') || errorMessage.includes('null')) {
        setError('Rendering error: DOM element not available. Please try again.');
      } else {
        setError(errorMessage);
      }
      setSvgContent('');
      lastRenderedContent.current = ''; // Reset on error
    } finally {
      setIsRendering(false);
    }
  }, []);

  // Update DOM when SVG content changes
  useEffect(() => {
    if (mermaidRef.current && svgContent) {
      try {
        mermaidRef.current.innerHTML = svgContent;
      } catch (err) {
        console.error('Error updating DOM with SVG content:', err);
        setError('Error displaying diagram. Please try refreshing.');
      }
    }
  }, [svgContent]);

  const renderPreviewTab = () => {
    if (error) {
      return (
        <div className="mermaid-error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            <strong>Diagram Error:</strong>
            <pre>{error}</pre>
            <button 
              className="retry-button"
              onClick={() => {
                setError(null);
                renderMermaid();
              }}
            >
              重试渲染
            </button>
          </div>
        </div>
      );
    }

    if (isRendering) {
      return (
        <div className="mermaid-loading">
          <div className="loading-spinner"></div>
          <span>正在渲染图表...</span>
        </div>
      );
    }

    return (
      <div className="mermaid-preview">
        <div 
          ref={mermaidRef} 
          className="mermaid-container"
        />
        {!svgContent && !isRendering && (
          <div className="mermaid-empty">
            <p>图表内容为空或语法错误</p>
            <button 
              className="retry-button"
              onClick={renderMermaid}
            >
              重新渲染
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSourceTab = () => {
    return (
      <div className="mermaid-source">
        <pre className="source-code">
          <code>{content}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className={`mermaid-renderer ${className}`}>
      {/* Tab navigation */}
      <div className="mermaid-tabs">
        <button
          className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          预览
        </button>
        <button
          className={`tab-button ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          源码
        </button>
      </div>

      {/* Tab content */}
      <div className="mermaid-content">
        {activeTab === 'preview' ? renderPreviewTab() : renderSourceTab()}
      </div>
    </div>
  );
};