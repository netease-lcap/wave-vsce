import { FileItem, AttachedImage } from '../types';

/**
 * 将 contenteditable 的内容转换为 Markdown 格式，并提取图片。
 * 
 * 假设 contenteditable 中的标签使用特定的 HTML 结构，例如：
 * <span class="context-tag" data-path="..." data-name="..." data-icon="..." data-is-image="...">...</span>
 */
export const convertToMarkdown = (container: HTMLElement): { markdown: string, images: AttachedImage[] } => {
  let markdown = '';
  const images: AttachedImage[] = [];

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      markdown += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.classList.contains('context-tag-container')) {
        const path = element.getAttribute('data-path') || '';
        const isImage = element.getAttribute('data-is-image') === 'true';
        const imageUrl = element.getAttribute('data-image-url');
        
        // 转换为 Markdown 格式的标签
        markdown += `[@file:${path}]`;
        
        // 如果是图片且有数据，则提取
        if (isImage && imageUrl) {
          images.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            data: imageUrl,
            mimeType: imageUrl.split(';')[0].split(':')[1] || 'image/png',
            filename: element.getAttribute('data-name') || 'pasted-image.png'
          });
        }
      } else if (element.tagName === 'BR') {
        markdown += '\n';
      } else if (element.tagName === 'DIV' || element.tagName === 'P') {
        if (markdown.length > 0 && !markdown.endsWith('\n')) {
          markdown += '\n';
        }
        Array.from(element.childNodes).forEach(traverse);
      } else {
        Array.from(element.childNodes).forEach(traverse);
      }
    }
  };

  Array.from(container.childNodes).forEach(traverse);
  return { markdown, images };
};

/**
 * 解析 Markdown 中的标签语法 [@file:path] 和 [Selection: fileName#start-end]
 */
export const parseMentions = (text: string): Array<{ type: 'text' | 'mention' | 'selection', content: string, path?: string, isImage?: boolean, fileName?: string, startLine?: string, endLine?: string }> => {
  const parts: Array<{ type: 'text' | 'mention' | 'selection', content: string, path?: string, isImage?: boolean, fileName?: string, startLine?: string, endLine?: string }> = [];
  const regex = /\[@file:(.*?)\]|\[Selection: (.*?)#(\d+)-(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    
    if (match[1]) {
      // @file mention
      const path = match[1];
      const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path);
      parts.push({ type: 'mention', content: match[0], path, isImage });
    } else if (match[2]) {
      // Selection
      parts.push({ 
        type: 'selection', 
        content: match[0], 
        fileName: match[2], 
        startLine: match[3], 
        endLine: match[4] 
      });
    }
    
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
};
